# PERFO Kafka 인수인계 가이드

이 문서는 PERFO에서 Kafka가 현재 어떤 역할을 하는지, 실제 메시지 흐름이 어떻게 생겼는지, 그리고 유지보수하면서 주로 손댈 가능성이 높은 지점을 빠르게 파악하기 위한 인수인계 문서다.

## 1. 먼저 결론

현재 Kafka는 "티켓팅 요청을 직접 처리하는 메인 진입점"이 아니다.

- 사용자의 티켓팅 요청은 먼저 HTTP로 backend에 들어온다.
- backend가 DB 트랜잭션 안에서 결과를 확정한다.
- 그 결과를 `ticketing_outbox` 테이블에 저장한다.
- 별도 relay가 outbox를 Kafka로 발행한다.
- projection consumer가 Kafka 메시지를 다시 읽어 `ticketing_purchase_projection` 테이블에 적재한다.

즉 현재 구조는 **HTTP 요청 처리 + DB outbox + Kafka 비동기 후처리 + projection 조회**다.

Kafka를 빼면 "실시간 후처리/분석/운영 조회 파이프라인"이 약해지고, Kafka가 죽어도 "핵심 구매 확정 자체"는 DB 트랜잭션 기준으로 끝난다.

## 2. 현재 Kafka가 쓰이는 정확한 위치

### 2.1 인프라

- 로컬 compose의 Kafka 브로커: [docker-compose.yml](/Users/joowon/Desktop/workspace/PERFO/docker-compose.yml:10)
- backend가 브로커 주소를 읽는 설정: [application.yml](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/resources/application.yml:10)

핵심 설정값:

- `SPRING_KAFKA_BOOTSTRAP_SERVERS`
- `TICKETING_OUTBOX_TOPIC` 기본값: `ticketing.purchase-results`
- `TICKETING_PROJECTION_GROUP_ID` 기본값: `ticketing-projection-v1`
- `TICKETING_OUTBOX_RELAY_ENABLED`
- `TICKETING_PROJECTION_CONSUMER_ENABLED`

실무적으로는 `relay-enabled`, `consumer-enabled` 두 토글이 제일 중요하다. 둘 다 `false`면 Kafka 코드는 살아 있어도 실제로는 파이프라인이 돌지 않는다.

### 2.2 메시지를 만드는 쪽

티켓팅 결과는 [TicketingService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt:19) 에서 확정된다.

여기서 하는 일:

- 요청 idempotency 확인
- 이벤트 재고/오픈 시간/중복 구매/인당 제한 검증
- 성공이면 티켓 발급 + 재고 차감
- 실패든 성공이든 ledger 완료
- 그 결과를 outbox에 저장

outbox 저장은 [TicketingOutboxService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxService.kt:11) 가 담당한다.

저장되는 이벤트 타입은 두 가지다.

- `PURCHASE_SUCCEEDED`
- `PURCHASE_REJECTED`

메시지 payload 계약은 같은 파일 아래의 `TicketingOutboxPayload`다.

### 2.3 중간 저장소: outbox 테이블

DB 엔티티는 [TicketingOutbox.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/entity/TicketingOutbox.kt:13) 다.

중요 컬럼:

- `requestId`: 요청 단위 식별자
- `eventType`: 성공/실패 이벤트 타입
- `status`: `PENDING`, `PUBLISHED`, `FAILED`
- `payload`: 실제 Kafka로 나갈 JSON 본문
- `retryCount`
- `publishedAt`
- `lastError`

의미:

- `PENDING`: 아직 Kafka로 안 나감
- `PUBLISHED`: Kafka 발행 성공
- `FAILED`: Kafka 발행 실패, 재시도 대상일 수 있음

핵심 repository는 [TicketingOutboxRepository.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/repository/TicketingOutboxRepository.kt:1) 다.

여기서 유지보수 포인트는 보통 세 가지다.

- `findByIdForUpdate`: 단건 발행 시 동시성 제어
- `findByStatusOrderByIdAsc`: 배치 relay 대상 조회
- `countByStatus`: 운영 gauge 집계

### 2.4 Kafka로 실제 발행하는 쪽

실제 producer는 [TicketingOutboxPublisherService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxPublisherService.kt:14) 다.

동작 순서:

1. outbox row를 `PESSIMISTIC_WRITE`로 잠금
2. 상태가 `PENDING` 또는 `FAILED`인지 확인
3. `TicketingOutboxMessage` JSON 생성
4. `KafkaTemplate<String, String>` 으로 발행
5. 성공 시 `PUBLISHED`, 실패 시 `FAILED`

실제 key는 `requestId`다.

```kotlin
kafkaTemplate.send(topic, outbox.requestId, message)
```

즉 같은 `requestId` 기준으로 파티션 정렬을 기대하는 구조다.

### 2.5 relay 스케줄러

[TicketingOutboxRelayService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxRelayService.kt:10) 가 주기적으로 outbox를 비운다.

중요 포인트:

- `@Scheduled`
- `relay-enabled=false`면 아무것도 안 함
- `PENDING` 우선 처리
- 남는 capacity가 있으면 `FAILED` 중 재시도 가능 건 처리
- `retry-backoff-seconds`
- `max-retry-count`

실제로 운영 중 "왜 Kafka에 안 나가지?"를 볼 때 제일 먼저 보는 곳이 여기다.

### 2.6 Kafka를 소비하는 쪽

consumer는 [TicketingProjectionConsumerService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionConsumerService.kt:12) 다.

`@KafkaListener` 설정:

- topic: `app.ticketing.outbox.topic`
- group id: `app.ticketing.projection.group-id`
- `autoStartup`: `app.ticketing.projection.consumer-enabled`

consumer가 하는 일:

1. JSON을 `TicketingOutboxMessage`로 파싱
2. envelope/payload 계약 검증
3. `outboxId` 기준 중복 소비 체크
4. projection row 저장
5. 성공/실패/중복 skip 메트릭 기록

중복 방지 기준은 `outboxId`다.

즉 at-least-once 소비를 가정하고, **projection 저장은 idempotent** 하게 만든 구조다.

### 2.7 projection 저장소와 조회

projection 엔티티는 [TicketingPurchaseProjection.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/entity/TicketingPurchaseProjection.kt:12) 다.

핵심 컬럼:

- `outboxId` unique
- `eventId`
- `userId`
- `eventType`
- `result`
- `ticketIds`
- `ticketNumbers`
- `remainingQuantity`
- `occurredAt`
- `projectedAt`

조회 서비스는 [TicketingProjectionQueryService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionQueryService.kt:8), API 노출은 [TicketingController.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/controller/TicketingController.kt:17) 에 있다.

이 projection API는 "운영 점검/관측용 조회"에 가깝다.

## 3. 요청부터 Kafka까지 실제 흐름

현재 실제 흐름은 아래다.

1. frontend가 backend의 `POST /api/ticketing/requests`를 호출
2. [TicketingService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt:26) 가 DB 트랜잭션 안에서 구매 성공/실패를 확정
3. 같은 트랜잭션에서 `ticketing_outbox` row 저장
4. relay 스케줄러가 `PENDING` outbox를 조회
5. publisher가 Kafka topic `ticketing.purchase-results`로 발행
6. projection consumer가 메시지를 읽음
7. `ticketing_purchase_projection` 테이블에 적재
8. 운영/디버깅 API가 projection summary를 조회

중요한 해석:

- **핵심 비즈니스 정합성은 DB 트랜잭션에서 끝난다**
- Kafka는 "사후 전파와 운영 조회용 read model" 역할이 더 강하다
- Kafka 장애는 구매 확정 자체보다 projection freshness에 더 직접적으로 영향을 준다

## 4. 지금 내가 Kafka 관련해서 주로 건드릴 가능성이 높은 부분

### 4.1 토픽명, 그룹명, enable 토글, 배치/재시도 설정

가장 흔한 수정 포인트는 [application.yml](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/resources/application.yml:50) 이다.

주로 바꾸는 값:

- `app.ticketing.outbox.topic`
- `app.ticketing.projection.group-id`
- `app.ticketing.outbox.relay-enabled`
- `app.ticketing.projection.consumer-enabled`
- `batch-size`
- `retry-backoff-seconds`
- `max-retry-count`

이건 기능 개발보다 운영 안정화 때 자주 건드린다.

### 4.2 메시지 payload 스키마

티켓팅 결과 이벤트에 필드를 추가하거나 의미를 바꿀 때는 [TicketingOutboxService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxService.kt:11) 의 `TicketingOutboxPayload`를 먼저 본다.

대표 예시:

- projection 화면에 새 필드가 필요함
- downstream 소비자가 새 필드를 요구함
- 성공/실패 결과 분류 기준이 바뀜

수정 시 같이 봐야 하는 곳:

- producer payload 생성부
- consumer의 `validateEnvelope`
- projection entity 저장 필드
- projection query response
- 관련 테스트

### 4.3 outbox 발행 실패 처리

Kafka 연결 장애, 타임아웃, 재시도 정책 문제를 볼 때는 [TicketingOutboxPublisherService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxPublisherService.kt:14) 와 [TicketingOutboxRelayService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxRelayService.kt:10) 를 본다.

주로 만지는 포인트:

- send timeout
- 예외 분류
- FAILED 재시도 조건
- batch 우선순위
- max retry 초과 시 처리 기준

### 4.4 consumer 계약 검증과 idempotency

메시지 계약이 바뀌거나 중복 소비 이슈가 생기면 [TicketingProjectionConsumerService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionConsumerService.kt:12) 를 건드릴 가능성이 높다.

주로 수정되는 부분:

- `validateEnvelope`
- `outboxId` 기반 중복 소비 정책
- invalid contract 처리 방식
- persistence failure 시 재시도 기대 여부

주의:

consumer는 현재 예외를 던져 실패를 표면화한다. 따라서 계약을 쉽게 깨면 projection 소비가 연속 실패로 이어질 수 있다.

### 4.5 projection 조회 형식

운영 화면이나 관리자 API가 "최근 실패만 보고 싶다", "남은 재고 히스토리를 보고 싶다" 같은 요구를 내면 보통 아래를 수정한다.

- [TicketingPurchaseProjection.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/entity/TicketingPurchaseProjection.kt:12)
- [TicketingPurchaseProjectionRepository.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/repository/TicketingPurchaseProjectionRepository.kt:1)
- [TicketingProjectionQueryService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionQueryService.kt:8)
- [TicketingController.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/controller/TicketingController.kt:17)

### 4.6 티켓팅 도메인 규칙 변경

Kafka를 직접 고치는 건 아닌데 결과적으로 Kafka 메시지가 달라지는 경우가 많다. 그 출발점은 대부분 [TicketingService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt:19) 다.

대표 변경 예시:

- 중복 구매 정책 변경
- 인당 구매 제한 변경
- 오픈/종료 시간 판정 기준 변경
- 성공/실패 result 종류 추가
- 응답 메시지 변경

이런 변경은 거의 항상 outbox payload와 projection 결과에도 영향을 준다.

## 5. 지금 기준으로 "실사용 Kafka 경로"와 "실험 흔적" 구분

### 5.1 실사용 경로

실사용 기준 Kafka 경로는 backend의 outbox relay -> purchase-results topic -> projection consumer 다.

실사용 파일:

- [TicketingService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt:19)
- [TicketingOutboxService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxService.kt:11)
- [TicketingOutboxRelayService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxRelayService.kt:10)
- [TicketingOutboxPublisherService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxPublisherService.kt:14)
- [TicketingProjectionConsumerService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionConsumerService.kt:12)
- [TicketingProjectionQueryService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionQueryService.kt:8)

### 5.2 아직 실사용으로 연결되지 않은 흔적

frontend 쪽 Kafka 파일은 현재 코드 검색 기준으로 어디에서도 import/use 되지 않는다.

- [frontend/lib/kafka/producer.ts](/Users/joowon/Desktop/workspace/PERFO/frontend/lib/kafka/producer.ts:1)
- [frontend/workers/ticketing-consumer.ts](/Users/joowon/Desktop/workspace/PERFO/frontend/workers/ticketing-consumer.ts:1)

이 파일들은 초기에 "Kafka로 직접 ticketing request를 흘리려던 실험 흔적"에 가깝고, 현재 운영 경로의 일부로 보면 안 된다.

즉 지금 손대야 하는 Kafka 코드는 프론트가 아니라 **backend** 쪽이다.

## 6. 장애가 났을 때 어디부터 볼지

### 6.1 구매는 되는데 projection이 안 쌓임

우선순위:

1. `ticketing_outbox`에 `PENDING` 또는 `FAILED` row가 쌓이는지 확인
2. `TICKETING_OUTBOX_RELAY_ENABLED=true`인지 확인
3. `TICKETING_PROJECTION_CONSUMER_ENABLED=true`인지 확인
4. Kafka broker 접속 가능 여부 확인
5. projection consumer 예외 로그 확인

가장 먼저 볼 파일:

- [TicketingOutboxRelayService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxRelayService.kt:10)
- [TicketingOutboxPublisherService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxPublisherService.kt:14)
- [TicketingProjectionConsumerService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionConsumerService.kt:12)

### 6.2 outbox가 계속 FAILED로 남음

주로 원인은 이쪽이다.

- Kafka broker 주소 오설정
- topic 접근 문제
- serialization/contract 문제
- broker 자체 장애

보는 포인트:

- `lastError`
- `retryCount`
- `perfo.ticketing.outbox.publish.failure`
- `perfo.ticketing.outbox.failed.count`

### 6.3 consumer는 도는데 projection이 저장 안 됨

주로 원인은 이쪽이다.

- `validateEnvelope`에서 계약 위반
- 동일 `outboxId` 중복 소비
- projection persistence error

보는 포인트:

- `perfo.ticketing.projection.consume.failure`
- `perfo.ticketing.projection.consume.duplicate_skip`
- projection table unique 제약

## 7. 관측 지표

메트릭 정의는 [TicketingPipelineObservability.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/observability/TicketingPipelineObservability.kt:17) 에 있다.

중요 메트릭:

- `perfo.ticketing.outbox.pending.count`
- `perfo.ticketing.outbox.failed.count`
- `perfo.ticketing.outbox.publish.success`
- `perfo.ticketing.outbox.publish.failure`
- `perfo.ticketing.outbox.publish.retry`
- `perfo.ticketing.projection.consume.success`
- `perfo.ticketing.projection.consume.duplicate_skip`
- `perfo.ticketing.projection.consume.failure`
- `perfo.ticketing.projection.last_lag.seconds`
- `perfo.ticketing.projection.seconds_since_last_success`

운영 알람 초안 문서는 [18_TICKETING_OBSERVABILITY_ALERTS.md](/Users/joowon/Desktop/workspace/PERFO/docs/02_Development/00_Plan/18_TICKETING_OBSERVABILITY_ALERTS.md:1) 를 같이 보면 된다.

## 8. 앞으로 Kafka 관련 변경할 때 체크리스트

### 8.1 이벤트 payload를 바꿀 때

반드시 같이 확인:

1. producer payload 생성
2. consumer contract validation
3. projection DB schema
4. projection query 응답
5. 관련 테스트

### 8.2 토픽이나 group id를 바꿀 때

반드시 같이 확인:

1. `application.yml`
2. 배포 env
3. consumer lag/offset 영향
4. 기존 topic 데이터와의 호환성

### 8.3 결과 enum을 추가할 때

반드시 같이 확인:

1. `TicketPurchaseResult`
2. `TicketingService`
3. `TicketingOutboxPayload`
4. `TicketingProjectionConsumerService.validateEnvelope`
5. projection summary 화면/응답

## 9. 내가 보기엔 앞으로 제일 많이 손댈 5군데

우선순위 기준으로 꼽으면 아래다.

1. [application.yml](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/resources/application.yml:50)  
운영 토글, 토픽, 그룹, 배치/재시도 설정

2. [TicketingService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt:19)  
티켓팅 결과 자체가 바뀌면 여기부터 바뀜

3. [TicketingOutboxService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingOutboxService.kt:11)  
Kafka payload 계약의 source of truth

4. [TicketingProjectionConsumerService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionConsumerService.kt:12)  
계약 검증, idempotency, projection 적재

5. [TicketingProjectionQueryService.kt](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/kotlin/com/perfo/backend/service/TicketingProjectionQueryService.kt:8)  
운영 조회 요구가 생기면 거의 여기 수정

## 10. 한 줄 요약

현재 PERFO의 Kafka는 "티켓팅 구매를 직접 처리하는 주 시스템"이 아니라, **DB에서 확정된 티켓팅 결과를 비동기로 전파하고 projection으로 읽기 좋게 만드는 파이프라인**이다.

따라서 유지보수의 핵심은:

- 구매 정합성은 `TicketingService`
- 메시지 계약은 `TicketingOutboxService`
- 발행 안정성은 `TicketingOutboxRelayService`/`TicketingOutboxPublisherService`
- 소비 정합성은 `TicketingProjectionConsumerService`
- 운영 조회는 `TicketingProjectionQueryService`

이 다섯 축을 기준으로 보면 된다.
