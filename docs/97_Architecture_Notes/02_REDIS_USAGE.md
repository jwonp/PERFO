# Redis 사용 정리

> 2026-05-20 기준 현재 코드베이스에서 확인된 Redis 사용 현황을 정리한 문서다.

## 1. 결론

현재 PERFO에서 Redis는 인프라에는 포함되어 있지만, 핵심 티켓팅 정합성을 담당하는 주 저장소는 아니다.

현재 상태는 아래와 같다.

- Docker Compose에 Redis 컨테이너가 포함되어 있다.
- Frontend 런타임에 `REDIS_URL` 환경변수가 주입된다.
- 코드상 직접 확인되는 Redis 사용처는 `frontend/lib/redis/inventory.ts`다.
- 이 코드는 이벤트 재고 key를 `DECR`하는 작은 헬퍼다.
- 핵심 티켓팅 트랜잭션은 Redis가 아니라 PostgreSQL 기반으로 처리된다.

## 2. 현재 인프라에서의 위치

현재 로컬/기본 실행은 `docker-compose.yml` 기준으로 Redis를 함께 띄운다.

- 서비스명: `redis`
- 이미지: `redis:7-alpine`
- 볼륨: `redis_data`
- 포트: `${REDIS_PORT}:6379`

즉 Redis는 실행 환경에 들어가 있지만, 현재 핵심 도메인 경로의 중심이라고 보기는 어렵다.

## 3. 코드상 확인되는 실제 사용

### 3.1 재고 감소 헬퍼

현재 확인되는 직접 사용 코드는 `frontend/lib/redis/inventory.ts`다.

이 파일의 역할은 단순하다.

- `ioredis` 클라이언트를 생성
- `stock:{eventId}` 키에 대해 `DECR` 실행
- 감소 후 값이 `0` 이상이면 성공으로 판단

이 정도 구현만으로는 아래 운영 규칙은 아직 보이지 않는다.

- 초기 재고 적재
- 정합성 복구
- PostgreSQL과의 동기화
- 실패 보상
- 재시도
- 만료 처리

따라서 현재 기준으로는 "핵심 재고 시스템"보다는 "보조/실험성 재고 감소 헬퍼"로 보는 편이 정확하다.

### 3.2 Frontend 쪽 연결

현재 Compose 기준 `REDIS_URL`은 frontend 쪽에 주입된다.

이 말은 곧:

- Redis 사용 책임이 현재 backend보다 frontend 보조 코드에 더 가깝다.
- 최소한 현재 공개된 핵심 도메인 흐름은 Redis 중심으로 설계되어 있지 않다.

## 4. Redis를 쓰지 않는 핵심 경로

현재 핵심 티켓팅 흐름은 아래와 같다.

1. 사용자가 frontend BFF로 요청
2. backend `TicketingService`가 요청 처리
3. PostgreSQL 트랜잭션 안에서 ledger, 재고, 티켓, outbox 기록
4. 이후 Kafka projection 후처리

즉 아래 작업들은 현재 Redis가 아니라 PostgreSQL + backend가 담당한다.

- 재고 확정
- 구매 성공/실패 판정
- 멱등 처리
- outbox 기록

## 5. 현재 아키텍처상 의미

현재 Redis의 역할은 아래처럼 정리하는 것이 맞다.

- 필수 핵심 저장소가 아니라 보조/실험성 저장소
- 정합성 원본이 아니라 빠른 상태 처리 가능성이 있는 부가 계층
- 광범위 사용 중인 인프라가 아니라 제한적으로만 연결된 상태

과장하면 안 되는 부분:

- Redis가 있다고 해서 현재 티켓팅이 Redis 기반이라고 쓰면 안 된다.
- 현재 구현 기준 시스템 오브 레코드는 PostgreSQL이다.

## 6. 앞으로 핵심 경로로 올리려면 필요한 것

향후 Redis를 핵심 경로에 올리려면 최소한 아래 기준이 필요하다.

- 초기 재고 적재 규칙
- PostgreSQL과 Redis 간 동기화 규칙
- 실패 보상 및 재시도 규칙
- 멱등 규칙
- 분산 락 또는 Lua 스크립트 전략
- 장애 시 PostgreSQL 기준 복구 절차

## 7. 한 줄 요약

현재 PERFO에서 Redis는 실행 환경에는 포함되어 있지만, 실제 핵심 티켓팅 시스템을 떠받치는 주 저장소는 아니다. 지금 확인되는 직접 사용은 frontend의 단순 재고 감소 헬퍼 수준이며, 핵심 정합성은 PostgreSQL + backend 트랜잭션이 담당한다.
