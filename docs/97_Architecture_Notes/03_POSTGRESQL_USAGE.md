# PostgreSQL 사용 정리

> 2026-05-20 기준 현재 코드베이스에서 PostgreSQL이 어디서 어떻게 쓰이는지 정리한 문서다.

## 1. 결론

현재 PERFO에서 PostgreSQL은 가장 중요한 데이터 저장소이며, 실질적인 시스템 오브 레코드다.

PostgreSQL은 크게 두 축에서 사용된다.

- backend: 핵심 도메인 데이터와 트랜잭션 처리
- frontend: Prisma 기반의 알림/푸시 관련 서버 데이터 저장

즉 지금 구조는 "PostgreSQL 하나를 여러 런타임 계층이 나눠 쓰는 형태"에 가깝지만, 접근 계층과 책임은 분리되어 있다.

## 2. 어디서 사용되는가

### 2.1 Backend에서의 사용

Backend는 Spring Boot + JPA + Flyway 기반으로 PostgreSQL을 사용한다.

현재 의미:

- 핵심 도메인 엔티티 저장
- 구매 요청 처리 트랜잭션 수행
- ticketing ledger 저장
- outbox 저장
- projection 저장
- 인증/회원/이벤트/티켓/검표 관련 데이터 저장

설정 관점에서 backend는 `spring.datasource`와 JPA/Flyway를 통해 PostgreSQL에 연결된다.

### 2.2 Frontend에서의 사용

Frontend는 Prisma를 통해 PostgreSQL을 사용한다.

현재 의미:

- 알림 데이터 저장
- 푸시 구독 저장
- 알림 delivery 기록 저장
- ticket status snapshot 저장

즉 frontend는 단순 렌더링 계층이 아니라, 일부 서버 기능에 대해 자체 DB 접근 계층도 가진다.

## 3. Backend에서 PostgreSQL을 어떻게 쓰는가

### 3.1 핵심 도메인 저장소

Backend의 핵심 엔티티들은 PostgreSQL에 저장된다.

대표 성격:

- 사용자
- 이벤트
- 티켓
- 검증 이력
- 티켓팅 요청 ledger
- 티켓팅 outbox
- 티켓팅 purchase projection

즉 현재 도메인 정합성의 중심은 PostgreSQL이다.

### 3.2 티켓팅 트랜잭션

`TicketingService` 기준 핵심 티켓팅은 PostgreSQL 트랜잭션으로 처리된다.

현재 흐름:

1. `requestId` 멱등 여부 확인
2. 이벤트 row lock 획득
3. 이벤트 상태와 판매 시간 검증
4. 기존 구매 수량 확인
5. 잔여 수량 확인
6. 티켓 row 생성
7. 이벤트 재고와 다음 티켓 번호 갱신
8. request ledger 완료 상태 기록
9. outbox 기록

중요한 점:

- 구매 성공/실패의 최종 판정은 PostgreSQL 트랜잭션 안에서 끝난다.
- Kafka는 그 뒤의 비동기 후처리 계층이다.
- Redis는 현재 이 핵심 경로의 주 저장소가 아니다.

### 3.3 Flyway migration

Backend는 Flyway migration을 사용한다.

현재 의미:

- 도메인 스키마 변경 이력 관리
- 티켓팅 phase1/outbox/projection 관련 스키마 적용
- 운영 환경에서 명시적 마이그레이션 기반 관리

즉 PostgreSQL은 단순 런타임 저장소가 아니라, migration을 동반한 주 데이터베이스다.

## 4. Frontend에서 PostgreSQL을 어떻게 쓰는가

### 4.1 Prisma 연결

Frontend는 `DATABASE_URL`이 있을 때 Prisma client를 생성해 PostgreSQL에 연결한다.

현재 의미:

- frontend 서버 런타임이 DB를 직접 읽고 쓴다
- 이 경로는 backend를 우회하는 별도 서버 기능 계층이다

### 4.2 Frontend가 소유하는 데이터 종류

Prisma schema 기준 frontend 쪽에서 직접 관리하는 주요 모델은 아래와 같다.

- `Notification`
- `PushSubscription`
- `NotificationDelivery`
- `TicketStatusSnapshot`

즉 이 영역은 backend 도메인 모델과 별개의 저장 책임이다.

### 4.3 Fallback 구조

Frontend 알림 계층은 PostgreSQL이 없을 때 로컬 JSON store fallback도 가진다.

이 의미는 다음과 같다.

- frontend 서버 기능 일부는 PostgreSQL 의존이 있지만
- 완전한 강제 단일 경로는 아니다
- 다만 운영 기준 저장소로는 PostgreSQL이 우선이다

## 5. 현재 아키텍처상 의미

현재 PostgreSQL의 위치는 아래처럼 보는 것이 정확하다.

- backend 도메인 정합성의 원본 저장소
- frontend 서버 부가 기능의 운영 저장소
- Kafka/Redis보다 더 중심적인 데이터 계층

즉 지금 구조에서 PostgreSQL은 "있으면 좋은 저장소"가 아니라, 사실상 가장 중요한 원본 데이터베이스다.

## 6. 주의해서 봐야 할 점

현재 구조는 PostgreSQL을 여러 계층이 공유하지만, 책임은 섞이면 안 된다.

구분:

- backend: 도메인 트랜잭션과 핵심 비즈니스 상태
- frontend: 알림/푸시/스냅샷 같은 부가 서버 기능 데이터

따라서 문서화나 운영 판단 시에는 아래를 분리해서 봐야 한다.

- "같은 PostgreSQL 인프라를 쓴다"
- "같은 테이블과 같은 책임을 공유한다"

이 둘은 다르다.

## 7. 한 줄 요약

현재 PERFO에서 PostgreSQL은 backend 핵심 도메인 트랜잭션과 frontend 알림/푸시 서버 기능을 함께 받치는 가장 중요한 데이터 저장소이며, 실제 시스템 오브 레코드 역할을 한다.
