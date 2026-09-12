# 티켓팅 API 부하테스트 계획

> 관련 문서:
> `docs/02_Development/00_Plan/13_PERFORMANCE_TEST_PLAN.md` (전체 성능 테스트 분류/템플릿, 상위 계획)
> `backend/src/test/kotlin/com/perfo/backend/service/TicketingConcurrencyTest.kt` (기존 동시성 단위 테스트)
> `backend/src/main/resources/db/migration/V20260603_2__itemized_booking.sql` (itemized booking 스키마)
>
> 이 문서는 13_PERFORMANCE_TEST_PLAN.md의 분류 체계를 따르되, 티켓팅 핵심 API(`/api/ticketing/requests` 등)에 한정해 실제 실행 가능한 구체 시나리오와 토큰 발급 전략을 정리한 실행 문서다.

## 1. 결정된 범위

- **대상 레이어**: Backend(Spring Boot) 직접. Next.js BFF는 거치지 않음. 백엔드 단독 성능/동시성 한계 측정이 목적.
- **테스트 환경**: 로컬 `docker-compose` 환경(Postgres, Kafka, MinIO 포함). 운영(MiniPC) 측정은 별도 단계로 분리.

## 2. 대상 API

| 우선순위 | API | 비고 |
|---|---|---|
| 1 | `POST /api/ticketing/requests` | 재고 차감 + lock + idempotency + Kafka outbox. 오버셀 방지 핵심 경로 |
| 2 | `GET /api/ticketing/events/{eventId}/projection` | 판매 현황 조회, 캐시 레이어 없음 |
| 2 | `GET/PUT /api/events/{eventId}/draft` | itemized booking 직전 단계. `version`은 저장 시 +1 되는 단순 카운터(JPA @Version 낙관락 아님) → 동시 PUT은 409 없이 last-write-wins |

## 3. 동시성 제어 지점 (부하테스트가 검증해야 할 것)

- `EventRepository.lockById` / `lockForShareById` — `for update`, `PESSIMISTIC_READ` (`backend/src/main/kotlin/com/perfo/backend/repository/EventRepository.kt:15-28`)
- `EventItemRepository.lockByEventIdAndIdIn` — itemized 모드 항목별 `for update` (`backend/src/main/kotlin/com/perfo/backend/repository/EventItemRepository.kt:12-26`)
- 재고 차감/검증 로직 — `TicketingService.kt:189-213`, itemized 분기 `:351-394`
- 멱등성(중복 요청) 처리 — `TicketingService.kt:45-46, 69-76`, `DataIntegrityViolationException` 캐치
- 사용자별 구매 제한(`maxPerUser`, `allowDuplicate`) — `TicketingService.kt:169-187`, itemized `:376-394`

부하테스트의 1차 목적은 "빠른가"가 아니라 **위 lock/멱등성 로직이 고동시성에서도 정합성을 지키는가**다.

## 4. 인증 토큰 전략

`HeaderAuthenticationFilter`가 경로별 scope를 요구하고(`/api/ticketing/**` → `ticketing`, `/api/tickets/**` → `tickets`), `InternalApiJwtService`가 internal JWT를 검증한다. 로그인 흐름을 타지 않고 직접 사인한다.

- claim: `kid`(헤더), `iss=perfo-frontend`, `aud=perfo-backend-ticketing`, `uid`, `email`, `role`, `scope`
- 서명 키: docker-compose `INTERNAL_API_JWT_ACTIVE_KID` / `INTERNAL_API_JWT_ACTIVE_SECRET` 값 재사용
- 사전 생성 스크립트(node `jsonwebtoken` 등)로 가상유저 N명분 토큰을 만들어 `tests/performance/data/tokens.json`에 저장 → k6에서 `SharedArray`로 로드, VU별 1개씩 라운드로빈

## 5. 시나리오

### 5.1 Smoke
- 1 VU, 1회 — 모든 대상 엔드포인트 2xx 확인. 토큰/시드 데이터 정상 동작 검증용.

### 5.2 오버셀 경쟁 테스트 (최우선)
- 재고 적은 이벤트(예: `remainingQuantity=50`) 시딩
- 500 VU 동시 1회성 요청 (`shared-iterations`, 거의 동시 시작)
- **검증**: `SUCCESS` 응답 합계 == 시딩한 재고 수, 오버셀 0건, DB `remainingQuantity` 음수 없음

### 5.3 Steady Load
- 재고 큰 이벤트로 0→200 VU 1분 ramp, 5분 유지
- p50/p95/p99 latency, 오류율 측정

### 5.4 Spike (티켓 오픈 재현)
- 0→1000 VU 10초 내 증가, 30초 유지 후 종료
- Hikari 커넥션 풀 고갈, Postgres lock 대기, Kafka consumer lag(`ticketing.purchase-results`) 관찰

### 5.5 Draft CRUD
- `GET/PUT /api/events/{eventId}/draft` latency 측정 (VU당 고유 유저로 초안 격리)
- `version`은 낙관락이 아니라 저장 시 +1 카운터라 동일 (event,user) 동시 PUT은 409 없이 last-write-wins → 409 검증 없음. 낙관락 도입 시 이 시나리오에 충돌 검증 추가.

## 6. 도구

- **k6** — HTTP 시나리오, ramp/threshold 표현 용이. 13_PERFORMANCE_TEST_PLAN.md 8.1과 동일 권장안.
- 스크립트 위치: `tests/performance/k6/{smoke,oversell-race,draft,steady,spike}.js`
- 토큰/시드 데이터: `tests/performance/data/`

## 7. 모니터링

- k6 기본: `http_req_duration`, `http_req_failed`, `vus`
- Postgres: `pg_stat_activity`, `pg_locks` (오버셀 경쟁 시나리오 중 lock 대기 확인)
- Kafka: `ticketing.purchase-results` 토픽 consumer lag
- Hikari pool active/idle/pending — `/actuator/metrics/hikaricp.connections.*` 노출 완료(actuator scope 토큰 필요). `tests/performance/scripts/sample-hikari.sh`로 주기 폴링

## 8. Raw 데이터 기록

요약 통계(p95 등)만 남기면 나중에 재분석이 불가능하다. 테스트 중에는 아래 세 종류를 모두 raw로 남긴다.

### 8.1 요청 단위 raw (k6)

k6 `--out json=<file>` 옵션으로 모든 샘플을 NDJSON으로 받는다. 비즈니스 결과(SUCCESS/SOLD_OUT 등)는 기본 출력에 없으므로 요청 시 custom tag로 직접 붙인다.

```js
// http_req_duration 등 기본 메트릭은 요청 시점 tags(endpoint)로만 구분되고,
// 응답 바디를 파싱해야 아는 비즈니스 result는 별도 custom metric으로 기록한다.
const ticketingResult = new Counter('ticketing_result');
const res = http.post(url, payload, { tags: { endpoint: 'ticketing_requests' } });
const body = JSON.parse(res.body);
ticketingResult.add(1, { result: body.result ?? 'HTTP_' + res.status });
```

기록 항목 (요청 1건당):

- `timestamp` — 요청 시각
- `scenario` — smoke / oversell_race / steady_load / spike / draft_crud
- `vu`, `iteration` — 어느 VU/반복인지
- `method`, `endpoint` (tag로 구분, path param 치환 전 이름)
- `status` — HTTP 상태 코드
- latency 분해 (k6 기본 메트릭): `http_req_duration`, `http_req_blocked`, `http_req_connecting`, `http_req_waiting`(TTFB), `http_req_receiving`
- `result` — 비즈니스 결과: `SUCCESS` / `SOLD_OUT` / `DUPLICATE_PURCHASE` / `MAX_PER_USER_EXCEEDED` / `ERROR`
- `requestId` — 멱등성 키로 보낸 값 (재요청 추적용)
- `eventId`, `eventItemId` — 어떤 이벤트/항목 대상이었는지

저장 경로: `tests/performance/results/<scenario>/<YYYYMMDD_HHMM>/k6_raw.json` (NDJSON 원본) + `k6_summary.json` (`handleSummary()`로 만든 p50/p95/p99 집계).

### 8.2 정합성 검증용 DB 스냅샷

테스트 직전/직후 DB 상태를 그대로 떠서 비교한다.

- 시작 전: 대상 이벤트의 `remaining_quantity`(또는 `event_items.remaining_quantity`), 대상 유저들의 기존 티켓/주문 수
- 종료 후: 동일 항목 재조회 + `booking_orders`, `tickets` row 수 직접 카운트
- 기록 항목: `initial_remaining`, `final_remaining`, `success_response_count`, `actual_row_count`, `oversold = actual_row_count > initial_remaining`

저장 경로: `tests/performance/results/<scenario>/<YYYYMMDD_HHMM>/db_snapshot_before.json`, `db_snapshot_after.json`

### 8.3 시스템 리소스 raw (주기 샘플링)

테스트 실행 중 별도 터미널에서 1~5초 간격으로 샘플링해 CSV로 누적.

- `docker stats --no-stream --format ...` → CPU%, MEM 사용량 (컨테이너별: backend, postgres, kafka)
- `pg_stat_activity` 카운트, `pg_locks` 대기 건수
- Kafka consumer lag (`kafka-consumer-groups.sh --describe --group ticketing-projection-v1`)

저장 경로: `tests/performance/results/<scenario>/<YYYYMMDD_HHMM>/system_metrics.csv`
컬럼: `timestamp, container, cpu_pct, mem_mb, pg_active_conn, pg_lock_wait_count, kafka_consumer_lag`

## 9. 실행 순서

1. 토큰 사전 생성 + smoke 통과 확인
2. 오버셀 경쟁 테스트 실행 → 즉시 DB 정합성 확인(8.2) → 재시딩
3. Steady load 실행
4. Spike 실행
5. Draft 동시 편집 실행
6. 결과 정리 (`docs/02_Development/01_Reports/performance/` 템플릿 사용, 13_PERFORMANCE_TEST_PLAN.md 14.2 참고)

## 10. 합격 기준 (가설값, 1차 측정 후 보정)

- 오버셀: 0건 (필수, 협상 불가)
- 쓰기 API(`/api/ticketing/requests`): p95 1s 이하
- 읽기 API(`projection`): p95 300ms 이하
- Draft API: p95 300ms 이하 (409 비율 기준은 현 구현에 낙관락 없어 제외 — 낙관락 도입 후 재도입)

## 11. 다음 단계

- [x] `tests/performance/k6/` 디렉터리 및 스크립트 작성 (smoke/oversell-race/draft/steady/spike)
- [x] 토큰 발급 스크립트 작성 (`issue-tokens.js`)
- [x] 시드 데이터(소량/대량 재고, itemized, 테스트 유저) 작성
- [x] 1차 로컬 측정 완료 → 결과 [`01_RESULTS_SUMMARY.md`](01_RESULTS_SUMMARY.md)
- [ ] Hikari 풀 크기 20/30 A/B 재측정 (pending·p95 이동)
- [ ] Kafka consumer lag / `pg_locks` 주기 샘플링 추가(계획 §8.3)
- [ ] 재고 차감 원자적 UPDATE 실험 후 락 보유시간·throughput 비교
