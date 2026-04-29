# PERFO 요청 처리 전략 가이드

> 이 문서는 티켓팅 요청 처리 로직, 상태 전파 방식, 세션/인증 전략, A/B 테스트 운영 규칙처럼 애플리케이션 전략만 다룬다.  
> 인프라, 배포, 확장, 다중화는 [01_ARCHITECTURE.md](./01_ARCHITECTURE.md)에서 관리한다.

## 목차

1. [문서 범위](#1-문서-범위)
2. [요청 처리 개요](#2-요청-처리-개요)
3. [도메인 경계](#3-도메인-경계)
4. [데이터 저장 전략](#4-데이터-저장-전략)
5. [정합성 기준과 실패 복구](#5-정합성-기준과-실패-복구)
6. [티켓팅 상태 전략](#6-티켓팅-상태-전략)
7. [세션과 인증 상태 전략](#7-세션과-인증-상태-전략)
8. [SSE 적용 이유](#8-sse-적용-이유)
9. [SSE 다중 인스턴스 상태 전파](#9-sse-다중-인스턴스-상태-전파)
10. [QR 검증 전략](#10-qr-검증-전략)
11. [분산 락과 중복 처리](#11-분산-락과-중복-처리)
12. [관리자 기능과 권한 모델](#12-관리자-기능과-권한-모델)
13. [A/B 테스트 운영 전략](#13-ab-테스트-운영-전략)
14. [API 계약과 도메인 이벤트 모델](#14-api-계약과-도메인-이벤트-모델)
15. [Kafka 마이그레이션 전략](#15-kafka-마이그레이션-전략)
16. [추가 고려 사항](#16-추가-고려-사항)
17. [부하 대응 아키텍처 기준](#17-부하-대응-아키텍처-기준)

## 1. 문서 범위

이 문서는 아래 질문에 답하기 위한 문서다.

- 티켓팅 요청을 어떤 순서로 처리하는가
- 재고와 발급 결과를 어디에 저장하는가
- 상태를 사용자에게 어떻게 전달하는가
- 인증과 세션 상태를 어떻게 관리하는가
- 티켓팅, QR 발급, QR 검증처럼 백엔드 부하가 집중되는 경로를 어떻게 흡수하는가
- A/B 테스트를 어떤 원칙으로 운영하는가
- 언제 Kafka로 넘어갈 것인가

## 2. 요청 처리 개요

### 2.1 요청 처리 구조도

```mermaid
flowchart TB
    User[사용자]
    UI[티켓팅 UI]
    API[Ticketing API]
    Auth[인증/세션 확인]
    Variant[A/B Variant 결정]
    ReqId[Request ID 발급]
    Redis[Redis 재고/임시 상태]
    DB[(PostgreSQL 최종 상태)]
    Publish[상태 발행]
    SSE[SSE 상태 전송]

    User --> UI
    UI --> API
    API --> Auth
    Auth --> Variant
    Variant --> ReqId
    ReqId --> Redis
    Redis --> DB
    DB --> Publish
    Publish --> SSE
    SSE --> UI
```

### 2.2 티켓 발급 정책

- 이벤트별 총 발행 수량 정의
- 중복 구매 허용 여부 정의
- 사용자별 최대 구매 수량 정의

### 2.3 요청 처리 흐름

1. API 서버가 티켓팅 요청을 수신한다.
2. 요청 단위 식별자를 발급한다.
3. Redis에서 재고를 확인하고 차감한다.
4. PostgreSQL 트랜잭션으로 구매 이력과 발급 결과를 저장한다.
5. DB에 최종 상태가 확정되면 상태 발행 계층을 통해 SSE로 클라이언트에 전달한다.

### 2.4 처리 원칙

- 사용자 중복 요청을 방지할 수 있어야 한다.
- 재고 차감과 발급 결과 저장의 정합성을 유지해야 한다.
- 실패 시 사용자에게 현재 상태를 명확하게 전달해야 한다.
- 최종 상태 확정은 반드시 PostgreSQL 기준으로 판단해야 한다.

## 3. 도메인 경계

### 3.1 핵심 경계

- `Ticketing`: 재고 차감, 구매 요청, 발급 결과 확정
- `Verification`: QR 검증, 사용 처리, 검증 이력 관리
- `Notification`: 푸시 알림, 상태 알림, 메시지 발송 요청
- `Admin Operations`: 조회, 재처리, 운영 개입, 감사 추적

### 3.2 경계 설계 원칙

- 관리자 기능은 티켓팅 핵심 경계와 분리 가능한 형태로 설계한다.
- 알림은 티켓팅 결과를 소비하는 별도 경계로 유지한다.
- 검증 기능은 티켓 발급과 연결되지만 독립된 상태 변경 경계로 본다.

## 4. 데이터 저장 전략

### 4.1 Redis 역할

- 재고 차감
- 임시 상태 저장
- 다중 인스턴스 환경에서의 상태 공유 기반

### 4.2 PostgreSQL 역할

- 최종 티켓 발급 결과 저장
- 구매 이력 관리
- 중복 구매 제한과 수량 제한 검증
- 상태 조회의 기준 데이터 제공

## 5. 정합성 기준과 실패 복구

### 5.1 최종 진실 원본

- 재고와 발급 결과의 최종 진실 원본은 `PostgreSQL`이다.
- Redis는 빠른 처리와 임시 상태 관리를 위한 보조 계층으로 사용한다.
- Redis와 DB 상태가 어긋나면 DB를 기준으로 복구한다.

### 5.2 실패 복구 원칙

- 복구는 무조건 자동 복구를 우선한다.
- 관리자 개입은 자동 복구가 실패했을 때만 최후의 보루로 사용한다.

### 5.3 대표 실패 시나리오

- `Redis 차감 성공 + DB 저장 실패`: DB 기준으로 재고 복구 또는 상태 재처리
- `DB 저장 성공 + SSE 전송 실패`: 상태는 이미 확정된 것으로 보고 SSE 재전송 또는 polling fallback
- `중복 요청 재시도`: 같은 idempotency key면 기존 처리 결과 반환

## 6. 티켓팅 상태 전략

### 6.1 상태 값 예시

- `PENDING`
- `PROCESSING`
- `SUCCESS`
- `FAILED`
- `SOLD_OUT`
- `DUPLICATE`

### 6.2 상태 관리 원칙

- 상태 값은 프론트와 백엔드가 동일한 계약으로 관리해야 한다.
- 상태 전이는 명확해야 하며, 같은 요청이 서로 다른 최종 상태를 가지면 안 된다.
- 실패 상태도 재시도 가능 여부를 포함해 사용자에게 해석 가능해야 한다.

## 7. 세션과 인증 상태 전략

- 인증 방식은 `JWT` 중심으로 간다.
- 앱 스케일링을 전제로 할 때 인증 상태를 특정 인스턴스 메모리에 두지 않는다.
- 강제 로그아웃과 토큰 폐기 기능은 제공하되, 운영자가 정말 필요한 상황에서만 제한적으로 사용한다.
- 관리자 기능과 일반 사용자 인증은 같은 인증 수단을 쓰더라도 권한 검증 기준을 분리한다.
- 세션 저장소를 Redis에 둘 경우 만료, 갱신, 강제 무효화 규칙을 명확히 해야 한다.

## 8. SSE 적용 이유

- 티켓팅 상태는 서버에서 클라이언트로 보내는 단방향 알림이 대부분이다.
- Polling보다 불필요한 반복 요청을 줄일 수 있다.
- WebSocket보다 구현과 운영이 단순하다.

### 통신 전략

| 기능 | 방식 | 이유 |
| --- | --- | --- |
| 티켓팅 상태 | SSE | 실시간 단방향 상태 push |
| 이벤트/티켓 목록 | Polling | 갱신 빈도 낮음 |
| QR 검증 | HTTP | 단발성 요청 |

## 9. SSE 다중 인스턴스 상태 전파

### 9.1 상태 전파 구조도

```mermaid
flowchart LR
    Worker[상태 변경 처리]
    RedisPubSub[Redis Pub/Sub]
    PodA[App Pod A]
    PodB[App Pod B]
    PodC[App Pod C]
    SSEA[SSE Client A]
    SSEB[SSE Client B]
    SSEC[SSE Client C]

    Worker --> RedisPubSub
    RedisPubSub --> PodA
    RedisPubSub --> PodB
    RedisPubSub --> PodC
    PodA --> SSEA
    PodB --> SSEB
    PodC --> SSEC
```

- 앱이 여러 Pod로 늘어나면 사용자가 어느 인스턴스에 붙든 동일한 상태를 받아야 한다.
- 이를 위해 Redis Pub/Sub 같은 공용 상태 전파 계층을 사용한다.
- SSE 연결은 각 인스턴스가 들고 있더라도, 상태 변경 이벤트는 공용 채널을 통해 받아 동일하게 전달해야 한다.
- 특정 인스턴스 메모리에만 상태가 있으면 스케일링과 장애 복구 시 일관성이 깨진다.
- SSE 연결 실패 시에는 polling fallback을 허용한다.

### 9.2 Polling fallback 정책

- SSE 재연결이 3회 연속 실패하면 polling fallback으로 전환한다.
- 서버 에러와 네트워크 에러는 동일하게 보지 않는다.
- 서버 에러는 서버 상태 이상 가능성을 우선 의심하고, 네트워크 에러는 클라이언트 연결 문제로 본다.
- 일반 목록 조회 fallback polling 주기는 3초로 둔다.
- 티켓팅 상태 조회 fallback polling 주기는 1초로 둔다.
- polling 중에도 SSE 복귀는 주기적으로 재시도한다.
- SSE 복귀 재시도는 exponential backoff를 적용한다.
- 클라이언트가 네트워크 정상화를 감지하면 SSE 복귀를 다시 시도한다.
- fallback 전환과 복귀는 사용자에게 별도 노출하지 않고 내부적으로 처리한다.
- 이 정책은 서버 부하보다 상태 정확도를 우선한다.

## 10. QR 검증 전략

- QR에는 `ticketId`, `eventId`, `userId`, 서명 정보를 포함한다.
- 위변조 방지를 위해 HMAC 또는 동등한 서명 방식을 사용한다.
- 모바일 스캐너는 QR을 읽은 뒤 서버 검증 API에 유효성을 확인한다.

## 11. 분산 락과 중복 처리

- 티켓팅은 같은 사용자의 중복 요청과 재시도를 기본적으로 고려해야 한다.
- 요청 단위 `idempotency key`를 도입하고, 같은 key면 기존 결과를 재사용한다.
- 재고 차감과 경쟁 조건이 겹치는 구간은 Redis 기반 분산 락 또는 동등한 제어 전략을 검토한다.
- 락은 무조건 도입하는 것이 아니라, DB 제약조건과 함께 어느 계층에서 일관성을 보장할지 기준을 먼저 정해야 한다.

## 12. 관리자 기능과 권한 모델

### 12.1 관리자 경계

- 관리자 기능은 티켓팅 핵심 처리 경계와 분리 가능한 형태로 설계한다.
- 관리자 개입이 핵심 처리 로직을 직접 덮어쓰지 않도록 별도 운영 경로를 둔다.

### 12.2 권한 모델

- `운영 관리자`: 조회, 상태 확인, 재처리 요청
- `시스템 관리자`: 운영 관리자 권한 + 시스템 수준 설정과 복구 권한

### 12.3 개입 범위

- 관리자는 조회와 재처리만 허용한다.
- 상태 수동 수정은 기본적으로 허용하지 않는다.

## 13. A/B 테스트 운영 전략

- 이 프로젝트는 티켓팅과 티켓 검증 UX를 지속적으로 개선하기 위해 A/B 테스트를 운영한다.
- 같은 사용자는 실험 기간 동안 동일한 variant를 유지해야 한다.
- 티켓팅 진행 중에는 variant가 바뀌면 안 된다.
- 구매 완료율, 대기열 이탈률, 검증 소요 시간, 오류율 같은 지표를 variant별로 수집해야 한다.
- 카나리 배포는 A/B 테스트를 위한 사용자 노출 수단으로 활용한다.

### 13.1 실험 플랫폼 설계 기준

- variant 할당 기준은 `userId`로 고정한다.
- 실험 종료 기준과 롤백 기준을 배포 전에 정의한다.
- 지표 수집 방식은 이벤트 로그, 서버 로그, 분석 테이블 중 무엇을 기준으로 볼지 먼저 정한다.
- 안정성 지표와 UX 지표를 분리해서 판단해야 한다.

### 13.2 실험 종료 우선순위

- `전환율 차이`
- `운영 리스크`
- `오류율`
- `기간`

## 14. API 계약과 도메인 이벤트 모델

### 14.1 API 계약 전략

- API 계약은 호환성을 최대한 유지하면서 점진적으로 변경한다.
- 프론트와 백엔드 계약 변경 시 기존 클라이언트가 즉시 깨지지 않도록 점진 전환을 우선한다.

### 14.2 도메인 이벤트 모델

- 상태 변경은 공통 도메인 이벤트로 정의한다.
- 예시:
  - `TicketingRequested`
  - `TicketIssued`
  - `TicketingFailed`
  - `VerificationCompleted`
  - `NotificationRequested`
- 이 모델은 푸시, 로그 적재, 분석 이벤트, Kafka 도입 시 공통 기반으로 사용한다.

## 15. Kafka 마이그레이션 전략

### 15.1 Kafka 도입 시점

- API 서버가 직접 처리하기 어려울 정도로 동시 요청이 급증할 때
- 재고 확인과 발급 처리 지연보다 순간 피크가 훨씬 클 때
- 다수 애플리케이션 인스턴스 간 처리량 평준화와 비동기 재처리가 필요할 때

### 15.2 마이그레이션 단계

1. 현재 요청 처리 로직을 `request intake`, `inventory check`, `ticket persistence`, `status publish` 경계로 분리
2. Outbox 또는 경량 큐 진입점 추가
3. Kafka Producer/Consumer 도입
4. 실패 재처리와 파티셔닝 전략 설계

### 15.3 마이그레이션 원칙

- Kafka 도입 전후에도 요청 ID 기반 상태 조회 계약은 유지해야 한다.
- SSE 상태 발행 로직은 가능하면 동일한 인터페이스를 유지해야 한다.
- 사용자에게 보이는 요청 처리 흐름은 최대한 바꾸지 않는다.

## 16. 추가 고려 사항

- 운영 Runbook은 추후 별도 문서로 정리한다.
- 비용 계획과 장기 보관 정책은 서비스 규모가 커질 때 더 구체화한다.

## 17. 부하 대응 아키텍처 기준

이 섹션은 plan profile에서 티켓팅, QR 토큰 발급, QR 검증 같은 백엔드 부하 집중 기능을 설계할 때 기본 기준으로 사용한다. 목표는 앱 Pod 증설만으로 버티는 구조가 아니라, 요청 진입부터 저장소 쓰기까지 병목을 분리하고 실패 시 사용자가 해석 가능한 상태를 받게 하는 것이다.

### 17.1 부하 집중 경로 분류

| 경로 | 부하 특성 | 정합성 기준 | 기본 처리 방식 |
| --- | --- | --- | --- |
| 티켓팅 요청 접수 | 오픈 시점에 짧은 시간 동안 순간 피크 발생 | 재고 초과 발급 금지, 사용자별 구매 제한 | API는 요청을 접수하고 idempotency key 기준 상태를 만든 뒤 Redis/큐 기반 처리로 평준화 |
| 재고 차감과 발급 확정 | 경쟁 조건과 DB 쓰기 병목 발생 | PostgreSQL 최종 상태, Redis는 보조 계층 | Redis 원자 연산 또는 Lua script로 선차감 후 DB 트랜잭션으로 확정 |
| QR 토큰 발급 | 입장 직전 반복 요청 발생 | 짧은 TTL, 권한 검증, 토큰 재사용 제한 | 캐시 가능한 예약 상태는 Redis로 보조하되 토큰 서명과 최종 권한은 서버에서 검증 |
| QR 검증 | 현장 입장 피크에 다수 단말이 연속 요청 | 같은 예약권은 단 한 번만 `USED` 처리 | DB 조건부 업데이트를 hot path로 두고 검증 이력은 트랜잭션 또는 outbox로 기록 |
| 상태 전파 | 처리 결과를 다수 클라이언트에 전달 | 최종 상태는 PostgreSQL 기준 | Redis Pub/Sub + SSE, 실패 시 polling fallback |

### 17.2 요청 진입 제어

- 티켓팅과 검증 API는 일반 API와 별도 rate limit bucket을 사용한다.
- rate limit key는 최소 `userId`, `eventId`, `clientIp`를 분리해서 설계한다.
- 티켓팅 오픈 직전에는 정적 이벤트 정보, 잔여 수량 표시, 대기 상태 조회를 캐시 가능한 읽기 경로로 분리한다.
- 쓰기 API는 idempotency key를 필수로 받고, 같은 key 재시도는 기존 상태를 반환한다.
- 클라이언트 재시도는 exponential backoff와 jitter를 적용한다.
- 서버가 과부하 상태이면 무제한 대기시키지 않고 `PROCESSING`, `RATE_LIMITED`, `RETRY_AFTER` 같은 해석 가능한 상태를 반환한다.

### 17.3 티켓팅 처리 파이프라인

```mermaid
flowchart LR
    Client[Client]
    Intake[Request Intake API]
    Dedupe[Idempotency / Dedupe]
    Admission[Rate Limit / Admission Control]
    Queue[Redis Stream or Kafka Topic]
    Worker[Ticketing Worker]
    Inventory[Redis Inventory Atomic Op]
    DB[(PostgreSQL Transaction)]
    Outbox[Outbox Event]
    Status[Status Store / SSE Publish]

    Client --> Intake
    Intake --> Dedupe
    Dedupe --> Admission
    Admission --> Queue
    Queue --> Worker
    Worker --> Inventory
    Inventory --> DB
    DB --> Outbox
    Outbox --> Status
```

처리 원칙:

- API 서버는 피크 순간에 모든 재고 차감과 DB 쓰기를 동기 처리하지 않는다.
- 요청 접수와 실제 발급 처리는 분리하고, 사용자는 request id로 상태를 조회한다.
- 초기 단계에서는 Redis Stream 또는 DB outbox로 시작할 수 있고, 피크가 커지면 Kafka로 전환한다.
- Worker concurrency는 DB connection pool, Redis 처리량, 이벤트별 재고 경쟁 수준을 기준으로 제한한다.
- 재고 차감 성공 후 DB 확정 실패가 발생하면 보상 작업을 통해 Redis 재고를 복구하거나 해당 요청을 재처리 큐로 보낸다.
- `SOLD_OUT`, `DUPLICATE`, `FAILED` 같은 최종 실패도 상태 저장소에 남겨 재시도 폭주를 막는다.

### 17.4 QR 발급과 검증 hot path

QR 토큰 발급:

- 예약 상태 조회는 캐시를 사용할 수 있지만, 토큰 발급 전 권한과 예약 상태는 서버에서 다시 검증한다.
- QR 토큰 TTL은 30초에서 60초를 기본값으로 둔다.
- 토큰은 내부 식별자를 그대로 노출하지 않는 opaque token 또는 서명된 payload로 만든다.
- 토큰 발급 실패가 검표 상태를 변경하면 안 된다.

QR 검증:

- 검증 요청은 HTTP 단발 요청으로 유지하되, 검표 단말의 연속 스캔을 고려해 낮은 지연 시간을 우선한다.
- 성공 처리는 반드시 DB 조건부 업데이트로 보호한다.
- 조건부 업데이트 예시는 아래 기준을 따른다.

```sql
UPDATE reservations
SET status = 'USED',
    used_at = now(),
    validated_by = :validatorUserId
WHERE id = :reservationId
  AND ticket_id = :ticketId
  AND status = 'AVAILABLE';
```

- 업데이트 row 수가 `1`이면 성공이고, `0`이면 최신 상태를 다시 조회해 `ALREADY_USED`, `EXPIRED`, `NOT_OPEN`, `FORBIDDEN` 중 하나로 응답한다.
- 검증 이력 저장 실패 때문에 이미 성공한 사용 처리를 rollback할지 여부는 정책으로 고정해야 한다. 기본값은 같은 트랜잭션에 저장하되, 트래픽이 커지면 outbox로 분리한다.
- 검표 실패 응답은 공격자가 토큰 유효성이나 티켓 존재 여부를 과도하게 추론하지 못할 정도로만 구체화한다.

### 17.5 저장소와 캐시 분리 기준

- PostgreSQL은 최종 진실 원본이며, 발급 확정과 검표 성공 처리는 Primary에 고정한다.
- Redis는 재고 선차감, 임시 상태, rate limit, Pub/Sub, 짧은 TTL 캐시에 사용한다.
- Redis 장애 시 티켓팅 신규 접수는 degrade 또는 일시 중단할 수 있지만, 이미 확정된 티켓 조회와 검표 정책은 별도로 정의한다.
- Redis에 세션, 락, Pub/Sub, 재고를 모두 올리는 초기 구성을 허용하되, 피크 테스트에서 병목이 확인되면 역할 분리를 우선한다.
- DB connection pool은 앱 Pod 수와 Worker 수를 곱한 총 연결 수 기준으로 산정한다.

### 17.6 백프레셔와 degrade 정책

| 상황 | 서버 행동 | 사용자 상태 |
| --- | --- | --- |
| rate limit 초과 | 요청 접수 거부 또는 짧은 retry-after 반환 | 잠시 후 재시도 |
| 큐 backlog 임계치 초과 | 신규 접수 제한, 기존 요청 상태 조회만 허용 | 처리 지연 |
| Redis 장애 | 티켓팅 신규 접수 중단 또는 보수적 실패 처리 | 일시 중단 |
| DB 쓰기 지연 | Worker concurrency 축소, 큐 처리 속도 제한 | 처리 중 |
| SSE 장애 | polling fallback 전환 | 상태 갱신 지연 |
| 검표 API 지연 | 단말 재시도 간격 확대, 중복 스캔 억제 | 검표 대기 |

degrade 원칙:

- 이미 확정된 성공 상태는 취소하지 않는다.
- 사용자가 반복 클릭하게 만드는 모호한 실패를 피한다.
- 신규 접수 제한과 기존 요청 상태 조회는 분리한다.
- 운영자는 backlog, 실패율, 평균 처리 시간, DB connection 사용률을 보고 접수 제한 여부를 판단한다.

### 17.7 관측성과 알람 기준

필수 메트릭:

- 티켓팅 접수 RPS, 승인 RPS, 거부 RPS
- idempotency hit ratio
- 이벤트별 Redis 재고 값과 DB 확정 수량 차이
- 큐 backlog, consumer lag, 처리 지연 p95/p99
- DB transaction latency, lock wait, connection pool 사용률
- QR 토큰 발급 RPS와 실패율
- QR 검증 RPS, 성공률, `ALREADY_USED` 비율, 조건부 업데이트 실패율
- SSE 연결 수, 재연결 수, polling fallback 전환 수

알람 기준:

- DB 확정 수량이 Redis 차감 수량과 지속적으로 어긋날 때
- 큐 backlog가 목표 처리 시간보다 오래 누적될 때
- 검표 성공 p95 지연 시간이 현장 운영 기준을 넘을 때
- `ALREADY_USED` 또는 `INVALID` 비율이 평소 기준보다 급증할 때
- Redis memory, evicted keys, command latency가 임계치를 넘을 때

### 17.8 plan profile 입력값

티켓팅 또는 검증 기능 계획을 세울 때 최소한 아래 값을 먼저 정한다.

- 이벤트별 예상 동시 접속자 수
- 티켓 오픈 후 1분, 5분, 10분 기준 예상 요청 수
- 목표 접수 RPS와 처리 완료 RPS
- 허용 가능한 상태 확정 지연 시간
- 최대 동시 SSE 연결 수
- 검표 단말 수와 단말당 초당 검증 요청 수
- PostgreSQL connection 상한과 목표 transaction latency
- Redis memory 한도와 persistence 필요 여부
- 장애 시 신규 접수 중단, 대기, 실패 중 어떤 정책을 쓸지
- Kafka 도입 전 Redis Stream/DB outbox로 버틸 수 있는 임계치
