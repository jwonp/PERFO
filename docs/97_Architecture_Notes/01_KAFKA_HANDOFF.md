# Kafka 인수인계

> 2026-05-20 기준 현재 구현에서 Kafka가 어디에 들어가고, 어떤 책임을 가지는지 정리한 문서다.

## 1. 결론

현재 PERFO에서 Kafka는 핵심 구매 트랜잭션 자체를 수행하는 저장소가 아니라, 티켓팅 결과를 비동기 후처리로 넘기는 메시징 계층이다.

즉 현재 역할은 다음에 가깝다.

- 구매 요청의 최종 성공/실패 판정은 PostgreSQL 트랜잭션에서 끝난다.
- 그 결과를 outbox에 기록한다.
- relay가 outbox를 Kafka topic으로 publish한다.
- consumer가 projection 테이블에 읽기 모델을 적재한다.

Kafka가 없으면 현재 설계상 불편해지는 것은 projection 후처리와 운영 가시성 경로이고, 구매 성공/실패 자체의 원본 판정은 backend + PostgreSQL이 담당한다.

## 2. 현재 흐름

현재 티켓팅 결과 비동기 흐름은 아래와 같다.

```text
frontend /api/ticketing/requests
  -> backend /api/ticketing/requests
  -> TicketingService
  -> PostgreSQL transaction
     - ticketing_request ledger 기록
     - event 재고/티켓 번호 갱신
     - ticket 생성
     - ticketing_outbox 기록
  -> 응답 반환

이후 비동기:
ticketing_outbox
  -> TicketingOutboxRelayService
  -> Kafka topic: ticketing.purchase-results
  -> TicketingProjectionConsumerService
  -> ticketing_purchase_projection 적재
```

## 3. 현재 구성 요소

### 3.1 동기 쓰기 쪽

`TicketingService`가 구매 요청을 처리한다.

핵심 책임:

- 이벤트 존재 여부 확인
- 판매 오픈/종료 시간 확인
- 중복 구매 허용 여부 확인
- 사용자별 최대 구매 수량 확인
- 잔여 수량 확인
- `requestId` 기준 멱등 처리
- 성공/실패 결과를 ledger와 outbox에 함께 기록

즉 Kafka에 메시지가 가기 전, 도메인 판정은 이미 끝난다.

### 3.2 Outbox relay

`TicketingOutboxRelayService`가 pending/failed outbox를 배치로 읽어 publish한다.

현재 코드상 특징:

- 스케줄러 기반 동작
- `PENDING`과 재시도 가능한 `FAILED` 항목 처리
- retry backoff와 max retry count 적용
- 기능 자체는 환경변수로 on/off 가능

핵심 환경변수:

- `TICKETING_OUTBOX_RELAY_ENABLED`
- `TICKETING_OUTBOX_RELAY_FIXED_DELAY_MS`
- `TICKETING_OUTBOX_BATCH_SIZE`
- `TICKETING_OUTBOX_RETRY_BACKOFF_SECONDS`
- `TICKETING_OUTBOX_MAX_RETRY_COUNT`
- `TICKETING_OUTBOX_TOPIC`

## 3.3 Kafka consumer

`TicketingProjectionConsumerService`가 Kafka 메시지를 consume한다.

현재 책임:

- JSON 메시지를 envelope로 역직렬화
- contract validation 수행
- `outboxId` 중복 여부 확인
- projection row 저장
- 중복 consume는 skip
- contract/persistence 실패는 observability에 기록

핵심 환경변수:

- `TICKETING_PROJECTION_CONSUMER_ENABLED`
- `TICKETING_PROJECTION_GROUP_ID`

## 4. Topic과 데이터 의미

현재 확인되는 topic 기본값:

- `ticketing.purchase-results`

이 topic에 실리는 의미는 "구매 결과 이벤트"다.

이벤트 타입은 크게 두 갈래다.

- `PURCHASE_SUCCEEDED`
- `PURCHASE_REJECTED`

중요한 점:

- Kafka는 재고 원본을 보관하는 곳이 아니다.
- Kafka는 구매 결과를 후속 소비자에게 전달하는 비동기 전달 계층이다.

## 5. Projection의 역할

Kafka consumer가 적재하는 projection은 운영/점검성 읽기 모델 성격이 강하다.

현재 성격:

- event별 최근 구매 시도 흐름 조회
- success/rejected count 확인
- 마지막 occurredAt / projectedAt 확인
- 운영 가시성 제공

관련 경로:

- frontend: `app/api/ticketing/events/[eventId]/projection/route.ts`
- backend: `GET /api/ticketing/events/{eventId}/projection`

이 API는 기본 비활성화이며, allowlist 기반으로만 열리도록 설계되어 있다.

## 6. 현재 운영 판단

현재 Kafka는 "구매 정합성의 원본"이 아니라 "비동기 후처리와 운영 가시성" 계층이다.

따라서 운영 판단은 아래처럼 하는 편이 맞다.

- PostgreSQL 트랜잭션 성공이 우선 원본이다.
- Kafka publish/consume 지연은 projection 지연으로 이어질 수 있다.
- Kafka 장애가 곧바로 구매 판정 로직 자체를 대체하지는 않는다.
- 다만 projection, 관측, 후속 자동화가 Kafka 경로에 의존할 수 있다.

## 7. 인수인계 포인트

- 구매 결과 원본은 `TicketingService`와 PostgreSQL 트랜잭션이다.
- Kafka는 outbox 이후 계층이다.
- relay와 consumer는 둘 다 환경변수로 꺼질 수 있다.
- projection은 사용자 핵심 기능보다 운영/점검 API 성격이 강하다.
- 중복 방지는 projection 테이블의 `outboxId` 기준으로 처리된다.
