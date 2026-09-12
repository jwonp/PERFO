# 오버셀 경쟟 테스트 결과 — 2026-07-13

계획: `docs/96_Performance_Tests/00_Ticketing_API_Load_Test/00_LOAD_TEST_PLAN.md` (핵심 위험 지점)
스크립트: `tests/performance/k6/oversell-race.js`, 검증: `tests/performance/scripts/verify-oversell.sh`
raw: `tests/performance/results/oversell_race_summary.json`, `oversell_race_result_counts.json`

## 1. 대상 / 환경

| 항목 | 값 |
|---|---|
| API | `POST /api/ticketing/requests` (SIMPLE booking, pessimistic lock `for update` + 재고차감 + Kafka outbox) |
| 이벤트 | `LOADTEST_SMALL_STOCK` (초기 재고 50, max_per_user=1, allow_duplicate=false) |
| 부하 | k6 per-vu-iterations, 500 VU × 1회 거의 동시 발사 |
| 토큰 | 유저 500명 각각 고유 internal JWT (uid=실제 users row, tickets FK 충족) |
| 총 실행시간 | 3.6s (500 iter 전량 완료) |

## 2. 정합성 결과 (PASS) — 최우선 검증

k6 응답 분포:

| result | 건수 |
|---|---|
| SUCCESS | **50** |
| SOLD_OUT | 450 |
| DUPLICATE_PURCHASE | 0 |
| MAX_PER_USER_EXCEEDED | 0 |

DB 직접 검증(`verify-oversell.sh 16 50`):

```
event_id=16 initial_stock=50 actual_ticket_count=50 remaining_quantity=0
PASS: 오버셀 없음, 재고 정합성 일치
```

- 발급 티켓 50 == 초기 재고 50, remaining_quantity 정확히 0. **오버셀 0건.**
- ticket_number 50개 전부 distinct — 동시성 하 번호 중복 발급 없음.
- SUCCESS 응답 합계(50) == 실제 DB row(50) — 응답과 영속 상태 불일치 없음.

→ **EventRepository pessimistic lock(`for update`)이 500 동시요청에서 재고를 정확히 방어함.**

## 3. 지연 분석

| 지표 | 값 |
|---|---|
| http_req_duration avg | 2,737ms |
| med | 2,741ms |
| p95 | 3,528ms |
| max | 3,559ms |

- **500 요청이 단일 event row의 `for update` 락에 직렬화**되어 큐잉. avg 2.7s는 락 대기 시간이 지배적.
- 정합성을 위한 의도된 직렬화지만, 실오픈(수천 동시)에선 이 지점이 throughput 상한이자 지연 병목.
- 락 대기 + Hikari 풀(기본 max 10) 이중 큐잉. 락을 잡으려면 커넥션부터 잡아야 하므로 풀 크기가 실효 동시 락 획득 수를 제한.

## 4. 해석 / 후속

- **정합성은 견고**. 이 테스트의 최우선 목표(오버셀 0) 달성.
- **지연은 설계 특성**. 재고 적은 인기 이벤트일수록 락 경합 심화 → 티켓오픈 spike에서 p99 수 초 예상.
- 개선 방향(별도 검토): 재고 차감을 낙관적/원자적 UPDATE(`update ... set remaining=remaining-1 where remaining>0`)로 바꾸면 락 보유시간 단축 가능. 단 현 방식이 정합성은 확실.
- [ ] spike 시나리오(0→1000 VU)에서 이 락 병목이 Hikari pending/커넥션 고갈로 어떻게 나타나는지 관찰 (다음 단계 Hikari 메트릭 노출 후)
