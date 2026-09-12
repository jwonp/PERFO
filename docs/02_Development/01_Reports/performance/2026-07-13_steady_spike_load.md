# Steady / Spike 부하테스트 결과 — 2026-07-13

계획: `docs/96_Performance_Tests/00_Ticketing_API_Load_Test/00_LOAD_TEST_PLAN.md`
스크립트: `tests/performance/k6/steady.js`, `tests/performance/k6/spike.js`
Hikari 샘플러: `tests/performance/scripts/sample-hikari.sh`
raw: `tests/performance/results/steady_summary.json`, `spike_summary.json`, `spike_hikari.csv`

## 1. 대상 / 환경

| 항목 | 값 |
|---|---|
| API | `POST /api/ticketing/requests` (SIMPLE, pessimistic write lock `for update` + 재고차감 + Kafka outbox) |
| 이벤트 | `LOADTEST_LARGE_STOCK` (재고 100000, max_per_user=10, allow_duplicate=false) — 재고 고갈 없이 순수 lock latency만 관찰 |
| backend | Spring Boot 3.4.3, **HikariCP 기본 풀 max=10** (actuator로 확인) |
| 토큰 | 유저 500명(uid 73–572) internal JWT, VU는 `__VU % 500`로 매핑 |

> 흐름 순서 확인: `TicketingService`는 **먼저 `eventRepository.lockById`(PESSIMISTIC_WRITE)로 event row 락을 잡은 뒤** DUPLICATE/MAX_PER_USER/SOLD_OUT을 검사한다. 따라서 max_per_user 소진으로 MAX_PER_USER_EXCEEDED가 되는 요청도 **락·커넥션은 동일하게 점유**한다 → 결과 분포와 무관하게 풀 경합은 그대로 측정된다.

## 2. Steady (200 VU, 5분 유지)

k6: `ramping-vus` 0→200(30s)→200 hold(5m)→0(15s), 총 5m45s.

| 지표 | 값 | threshold | 판정 |
|---|---|---|---|
| iterations | 50,413 (146.1/s) | — | — |
| ticketing_request p95 | **2,462ms** | p95<2000 | ❌ (초과) |
| avg / med | 1,281ms / 887ms | — | — |
| max | **43,334ms** | — | ⚠️ |
| http_req_failed | 0.33% (166/50,413) | rate<0.01 | ❌ |

- 200 VU가 단일 event row의 `for update` 락 + 풀 10에 직렬화 → p95 2.5s, avg 1.3s.
- **꼬리 지연 max 43s**: 5분 지속 부하에서 일부 요청이 커넥션 획득 대기 상한(Hikari `connectionTimeout` 기본 30s)을 넘겨 **166건 실패**. spike(30s hold)보다 max가 훨씬 큰 이유 = 지속시간이 길수록 대기 큐가 더 깊이 쌓임.

## 3. Spike (0→1000 VU 10s, 30s 유지)

k6: `ramping-vus` 0→1000(10s)→1000 hold(30s)→0(10s), 총 50s. 동시에 `sample-hikari.sh`로 풀 메트릭 1s 폴링.

| 지표 | 값 | threshold | 판정 |
|---|---|---|---|
| iterations | 11,446 (225.4/s) | — | — |
| ticketing_request p95 | 4,970ms | (느슨) | — |
| avg / med / max | 3,666ms / 4,009ms / 5,809ms | — | — |
| http_req_failed | **0.00%** (0/11,446) | rate<0.05 | ✅ |

### Hikari 풀 메트릭 (spike 구간)

`tests/performance/results/spike_hikari.csv`:

| 지표 | 값 |
|---|---|
| connections.active 피크 | **10 (= max)** — 풀 완전 포화 |
| connections.idle | 0 (부하 구간) |
| connections.**pending 피크** | **189** |
| connections.max | 10 |

- **active가 상한 10에 붙박이고 pending이 189까지** → 최대 189개 스레드가 커넥션 하나 잡으려 큐잉. 풀 크기 10이 유효 동시 처리량의 하드 상한임을 직접 증명.
- spike는 30s만 유지 → 대기시간이 커넥션 타임아웃(30s) 전에 소진되어 **실패 0**. throughput은 ~225 req/s로 수렴(= 풀 10 × 락 보유 회전율의 상한).

## 4. 해석 / 후속

- **병목 확정**: 단일 인기 이벤트의 `for update` 락 + Hikari 풀 max=10의 이중 직렬화. active=10 고정·pending 최대 189가 물증. throughput 상한 ~225 req/s.
- **지속 부하가 더 위험**: steady(5m)에서 대기 큐가 깊어져 connectionTimeout 초과 실패(0.33%)·max 43s 발생. spike(30s)는 짧아 실패 없음. 실오픈은 지속 spike라 둘의 최악을 합친 양상 예상.
- 개선 방향(별도 검토, 우선순위순):
  1. **Hikari 풀 크기 상향** — 가장 직접적. 단 DB 커넥션·CPU 상한과 균형 필요.
  2. **재고 차감을 원자적 UPDATE**(`update ... set remaining=remaining-1 where remaining>0`)로 → 락 보유시간 단축, 회전율↑. (oversell 리포트 §4와 동일 제안)
  3. 요청 큐잉/대기열(가상 대기실) 앞단 도입으로 백엔드 유입 자체를 평활화.
- [ ] 풀 크기 20/30으로 올려 재측정 시 pending·p95가 어떻게 이동하는지 A/B (다음 실험 후보)
- 계측 한계: `--summary-export`는 기본 퍼센타일(p95)만 남겨 p99 미기록. steady 166 실패의 status는 개별 샘플 미저장이라 미확보(재실행 시 `--out json` 필요).
