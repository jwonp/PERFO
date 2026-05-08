# 티켓팅 엔진 안정화 구현 계획

> 목표: PERFO 프로젝트에서 티켓 오픈 시각, 검표 시각, 예매 가능 시점을 정각 기준으로 안정적으로 운영하고,
> 동시성 상황에서도 초과 판매, 중복 구매, 상태 지연 없이 처리할 수 있는 구매 엔진을 만든다.

## 1. 현재 판단

현재 코드는 조회와 검표 쪽 실시간 시간 계산은 일부 보강됐지만, 실제 구매 승인 엔진은 아직 없다.

- `issued_tickets`는 운영자용 발급 티켓 메타를 관리한다.
- `events`, `tickets`는 실제 예약 결과와 검표 상태를 담는다.
- 발급 티켓 조회는 `openAt`, `validDate` 기준으로 응답 시점 상태를 계산한다.
- 예약 조회와 검표는 `validFrom`, `validUntil` 기준으로 즉시 `NOT_OPEN`, `EXPIRED`, `NOW_SERVING`을 계산한다.
- 하지만 실제 예매 요청을 원자적으로 승인하는 백엔드 API와 consumer는 없다.

### 현재 구조의 문제점

- Kafka producer는 존재하지만 실제 구매 성공 여부를 결정하는 진입점이 아니다.
- Kafka consumer는 뼈대만 있고, 구매 확정 로직이 없다.
- Redis 재고는 단순 `decr`라서 음수 진입, 중복 차감, 실패 롤백을 안전하게 다루지 못한다.
- `issued_tickets.status`는 운영자/조회 projection 성격인데, 실제 판매 가능 여부를 대신 판단하게 두면 위험하다.
- 스케줄러는 복구 용도로는 쓸 수 있어도, 정각 오픈의 권위 소스가 되면 안 된다.

결론: 구매 성공 여부는 Kafka나 스케줄러가 아니라 백엔드 DB 트랜잭션 한 곳에서 결정해야 한다.

## 2. 목표 아키텍처

권장 아키텍처는 `DB-first synchronous reservation engine`이다.

### 핵심 원칙

- 정각 오픈 판정은 백엔드가 요청 처리 시점에 즉시 수행한다.
- 재고 차감과 티켓 생성은 하나의 DB 트랜잭션에서 처리한다.
- Redis와 Kafka는 보조 역할만 맡고, 구매 성공/실패 판정의 권위는 갖지 않는다.
- 스케줄러는 정합성 복구와 projection 보정에만 사용한다.

### 권장 흐름

1. 클라이언트가 `requestId`를 포함한 예매 요청을 보낸다.
2. Next API는 인증 정보만 보강해서 백엔드 구매 API로 전달한다.
3. 백엔드는 DB 트랜잭션 안에서 다음을 순서대로 수행한다.
4. `requestId` 멱등성 조회 또는 생성
5. 이벤트 판매 가능 시간 확인
6. 사용자별 구매 제한 확인
7. 재고 차감
8. 예약 티켓 생성
9. 결과 저장 후 커밋
10. 커밋 이후 Kafka/outbox/알림 projection 전파

## 3. 예매 요청 진입점

예매 요청 진입점은 프론트 worker가 아니라 백엔드 API여야 한다.

### 권장 진입 경로

- `Frontend UI`
- `frontend/app/api/ticketing/requests/route.ts`
- `backend POST /api/ticketing/requests`

### 이유

- 인증과 사용자 식별은 Next API가 다루기 쉽다.
- 실제 판매 승인 로직은 Spring 트랜잭션에서 처리해야 한다.
- 프론트 worker/Kafka consumer를 구매 승인 경로에 두면 at-least-once 중복 처리와 지연 제어가 더 어려워진다.

## 4. Redis / Kafka / DB 책임 분리

### DB의 책임

- 판매 가능 시간의 최종 판정
- 재고 수량의 최종 차감
- 사용자당 구매 제한 검사
- `requestId` 멱등성 보장
- 티켓 생성과 결과 영속화
- 검표 1회성 보장

### Redis의 책임

- 짧은 TTL의 중복 요청 방지 lock
- rate limiting
- 대기열 또는 혼잡 완화용 카운터
- 읽기 성능 보조용 재고 캐시

Redis는 구매 승인 권위 저장소가 아니다.

### Kafka의 책임

- 구매 결과 이벤트 발행
- 알림/통계/운영자 대시보드 projection
- outbox relay 이후 비동기 후처리

Kafka는 구매 성공 여부를 결정하지 않는다.

## 5. 시간 기준 설계

시간 기준은 지금보다 더 엄격히 분리해야 한다.

### 기준

- 모든 판매/오픈/종료 시각은 DB에는 UTC instant로 저장한다.
- 운영자 입력과 사용자 표시만 `Asia/Seoul`로 변환한다.
- 이벤트 검표 가능 시간은 `validFrom`, `validUntil`을 `Asia/Seoul` 기준으로 해석하되, 내부 비교는 UTC 변환 후 수행한다.
- 발급 티켓 `openAt`은 이미 UTC 기준이므로 계속 유지한다.
- `validDate`처럼 날짜만 있는 값은 내부 비교용 `expireAtUtcExclusive` 개념으로 변환해 다뤄야 한다.

### 정각 오픈 보장 규칙

- 판매 가능 여부는 애플리케이션 서버 시간이 아니라 DB 기준 현재 시각으로 판정한다.
- 판정 조건은 `sale_open_at <= now < sale_close_at`처럼 반열림 구간으로 고정한다.
- 정각 전 요청은 절대 성공시키지 않는다.
- 정각 이후 첫 요청은 스케줄러를 기다리지 않고 즉시 성공 가능해야 한다.

## 6. 중복 구매 방지 / 재고 차감 / 멱등성 / 실패 복구

### 멱등성

- 모든 구매 요청은 `requestId`를 가진다.
- `requestId`는 사용자별 또는 전역 unique 제약으로 저장한다.
- 같은 `requestId` 재시도는 같은 결과를 반환한다.

### 중복 구매 방지

- `allowDuplicate = false`면 사용자-이벤트 기준 중복 구매를 DB에서 차단한다.
- `maxPerUser`는 `countByEventIdAndUserId` 같은 조회만으로 끝내지 말고, 트랜잭션 안에서 검사해야 한다.
- 필요하면 `(event_id, user_id, sequence)` 대신 별도 purchase aggregate를 둬도 된다.

### 재고 차감

- 재고 차감은 DB 조건부 update 또는 row lock으로 처리한다.
- `remaining_quantity > 0` 조건이 실패하면 즉시 `SOLD_OUT` 처리한다.
- Redis `decr`만으로 성공 판정을 내려서는 안 된다.

### 실패 복구

- DB 커밋 전 실패는 롤백으로 끝낸다.
- DB 커밋 후 Kafka 발행 실패는 outbox 재처리로 복구한다.
- Redis 캐시 갱신 실패는 캐시 miss와 재동기화로 복구한다.
- 운영자용 `issuedCount` 같은 projection 값은 주기적 reconcile 대상이다.

## 7. 일관성 기준

### 강한 일관성이 필요한 영역

- 판매 오픈 여부 판정
- 재고 차감
- 사용자당 구매 한도
- 구매 성공/실패 결과
- 검표 1회성 처리

### eventual consistency를 허용할 수 있는 영역

- 운영자 화면의 발급 수치
- 푸시 알림
- 통계 대시보드
- Kafka consumer 기반 projection
- Redis 캐시 재고 표시

## 8. `issued_tickets`와 `events`, `tickets`의 연결 원칙

둘은 연결하되 동일한 책임을 가지면 안 된다.

### `issued_tickets`

- 운영자용 발급 템플릿
- 스캔 UI 진입점
- 운영 상태 projection
- 티켓 이미지, 장소, 검표 메타

### `events`

- 실제 판매 인스턴스
- 판매 오픈/종료 시각
- 재고와 사용자당 구매 한도
- 활성 여부

### `tickets`

- 실제 구매 결과물
- 멱등성 키
- 구매 상태
- 검표 상태

### 연결 방식

- 단기: `events`에 `issued_ticket_id` FK 추가
- 장기: 한 운영자 발급 티켓이 여러 판매 회차를 가질 수 있게 1:N 확장 가능 구조 유지

중요한 점은 `issued_tickets.status`를 실제 구매 엔진의 권위 상태로 쓰지 않는 것이다.

## 9. 단계별 구현 계획

## Phase 1. 빠른 1차 안정화

목표는 “정확한 구매 성공/실패 판정”을 빠르게 만드는 것이다.

### 작업

- 백엔드에 `POST /api/ticketing/requests` 추가
- `requestId`를 저장하는 구매 요청 ledger 테이블 추가
- 이벤트 판매 시각 필드 추가
- DB 트랜잭션 기반 재고 차감 + 티켓 생성 로직 추가
- 동일 `requestId` 재시도 시 동일 결과 반환
- 프론트 Next API route 추가
- 기존 Kafka consumer/Redis 재고 코드는 핵심 경로에서 제외

### 의사결정 기준

- 정각 오픈 정확성이 최우선
- 처리량보다 정합성이 우선
- 비동기화는 커밋 이후만 허용

## Phase 2. 중기 구조 개선

목표는 고부하 시 운영 안정성을 올리는 것이다.

### 작업

- outbox 테이블 도입
- 구매 성공/실패 이벤트를 Kafka로 발행
- Redis에 rate limit, short lock, 재고 캐시 추가
- 운영자 대시보드 projection 분리
- `issuedCount`를 DB authoritative counter 또는 projection으로 명확히 재정의

### 의사결정 기준

- 코어 트랜잭션을 단순하게 유지
- 캐시와 메시징은 실패해도 구매 결과가 뒤집히지 않아야 함

## Phase 3. 장기 운영형 아키텍처

목표는 대형 티켓팅 트래픽에 대비한 구조로 키우는 것이다.

### 작업

- 대기열 또는 waiting room 도입 검토
- 판매 엔진 서비스를 별도 경계로 분리 검토
- 재고 선점 로직의 Redis Lua 기반 전처리 도입 검토
- 읽기 projection과 운영 API 분리
- DB 마이그레이션 체계를 Hibernate `ddl-auto=update`에서 명시적 migration 도구로 전환

### 의사결정 기준

- 분리의 목적은 성능이 아니라 장애 격리와 운영성 향상이어야 함
- 최종 확정은 끝까지 DB가 담당

## 10. 단계별 리스크와 테스트 전략

## Phase 1 리스크

- DB row lock 경합
- 이벤트/시간 컬럼 모델링 오류
- 중복 요청 처리 누락

### 테스트

- 정각 직전/직후 경계 테스트
- 동시 50~200 요청 경쟁 테스트
- 같은 `requestId` 재시도 테스트
- 매진 직전 2개 동시 요청 테스트
- `maxPerUser` 동시성 테스트

## Phase 2 리스크

- Kafka 중복 소비
- outbox 누락
- Redis 캐시 오염

### 테스트

- consumer 재처리 테스트
- outbox replay 테스트
- Redis 장애 시 fallback 테스트
- projection 지연 허용 범위 검증

## Phase 3 리스크

- 시스템 복잡도 증가
- 운영 난이도 상승
- 시간 동기화와 분산 장애 분석 비용 증가

### 테스트

- 부하 테스트
- chaos test
- clock skew 점검
- 복구 drill

## 11. 지금 코드베이스 기준 권장 변경 파일

### 백엔드 신규

- `backend/src/main/kotlin/com/perfo/backend/controller/TicketingController.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketingTimeService.kt` 또는 기존 `TicketingTime` 확장
- `backend/src/main/kotlin/com/perfo/backend/entity/TicketingRequest.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/TicketingRequestRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/dto/TicketingDto.kt`
- `backend/src/test/kotlin/com/perfo/backend/service/TicketingServiceTest.kt`
- `backend/src/test/kotlin/com/perfo/backend/service/TicketingConcurrencyTest.kt`

### 백엔드 수정

- `backend/src/main/kotlin/com/perfo/backend/entity/Event.kt`
- `backend/src/main/kotlin/com/perfo/backend/entity/Ticket.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/EventRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/TicketRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/controller/TicketController.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/ReservationService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
- `backend/src/main/resources/application.yml`

### 프론트 신규

- `frontend/app/api/ticketing/requests/route.ts`
- `frontend/lib/ticketing/request-id.ts`
- `frontend/lib/ticketing/ticketing-client.ts`

### 프론트 수정

- 예매 진입 화면 또는 향후 이벤트 상세/구매 버튼 화면
- 필요 시 `frontend/lib/kafka/producer.ts`는 운영 이벤트 발행 보조 모듈로 역할 축소
- `frontend/workers/ticketing-consumer.ts`는 현재 구매 승인 경로에서 제거 또는 재정의
- `frontend/lib/redis/inventory.ts`는 보조 캐시/락 유틸로 재설계

## 12. 구현 우선순위

1. 백엔드 구매 API와 DB 트랜잭션 구현
2. `requestId` 멱등성 ledger 구현
3. 이벤트 판매 시간 모델 정리
4. 동시성 테스트 작성
5. 프론트 예매 진입 route 연결
6. outbox/Kafka 후처리 도입
7. Redis 보조 기능 도입

## 13. daily 에이전트 실행 프롬프트

아래 프롬프트를 `daily` 에이전트에 그대로 전달해도 된다.

```text
PERFO 프로젝트에서 티켓팅 엔진 1차 안정화를 구현해줘.

필수 배경:
- 문서 기준은 docs/02_Development/00_Plan/15_TICKETING_ENGINE_STABILITY_PLAN.md
- 현재 issued_tickets는 운영자용 발급 메타이고, 실제 구매 성공/실패는 events/tickets 기준으로 처리해야 한다.
- 조회/검표의 실시간 시간 계산은 일부 들어가 있지만, 실제 구매를 원자적으로 처리하는 API는 없다.
- 목표는 정각 오픈, 중복 구매 방지, 재고 초과 방지, requestId 멱등성 보장이다.

이번 작업 범위:
- Phase 1만 구현
- Kafka/Redis는 구매 성공 판정의 권위 소스로 사용하지 말 것
- 백엔드 DB 트랜잭션 기반으로 구매 API를 구현할 것
- 프론트에는 Next API 프록시만 추가할 것

구현 요구사항:
- backend에 POST /api/ticketing/requests 추가
- requestId 멱등성 ledger 엔티티/리포지토리/서비스 추가
- Event에 판매 오픈/종료 시각 모델을 추가하거나 기존 필드를 구매 가능 시점 판정에 맞게 확장
- 재고 차감과 Ticket 생성은 하나의 트랜잭션에서 처리
- 정각 전 요청은 실패, 정각 이후 첫 요청은 즉시 성공 가능해야 함
- allowDuplicate=false 및 maxPerUser를 트랜잭션 안에서 강제
- 기존 Reservation/Verification 흐름과 충돌하지 않게 유지
- 테스트를 먼저 또는 함께 작성하고, 특히 동시성 테스트를 포함

권장 산출물:
- TicketingController
- TicketingService
- TicketingRequest entity/repository
- TicketingDto
- EventRepository/TicketRepository 보강
- frontend/app/api/ticketing/requests/route.ts
- 관련 단위 테스트 및 동시성 테스트

주의사항:
- 사용자의 기존 변경을 되돌리지 말 것
- Hibernate ddl-auto=update에 의존하더라도, 장기적으로는 migration 도입 필요성을 코드/문서에 남길 것
- issued_tickets.status를 구매 엔진의 권위 상태로 사용하지 말 것
- 시간 비교 기준은 UTC 저장, 운영 표시만 Asia/Seoul로 둘 것

완료 조건:
- 구매 성공/실패가 백엔드 한 곳에서 결정됨
- 같은 requestId 재시도 시 같은 결과를 반환함
- 동시 요청에서도 초과 판매가 발생하지 않음
- 변경 파일, 핵심 설계 판단, 테스트 결과/미실행 사유를 명확히 보고
```
