# 티켓팅 API 부하테스트 결과 요약 — 2026-07-13

계획: [`00_LOAD_TEST_PLAN.md`](00_LOAD_TEST_PLAN.md)
상세 리포트: `docs/02_Development/01_Reports/performance/`
스크립트: `tests/performance/k6/`, 검증/샘플러: `tests/performance/scripts/`

## 0. 환경

| 항목 | 값 |
|---|---|
| 환경 | 로컬 docker-compose 풀스택 (backend `full` + postgres/kafka/redis/minio) |
| backend | Spring Boot 3.4.3, **HikariCP 기본 풀 max=10** |
| 인증 | internal JWT 사전 서명(로그인 우회), VU별 유저 매핑 |
| 대상 API | `POST /api/ticketing/requests` (write), `GET/PUT /api/events/{id}/draft` |

## 1. 시나리오별 결과 한눈에

| 시나리오 | 부하 | 핵심 결과 | 판정 |
|---|---|---|---|
| **오버셀 경쟁** | 500 VU 동시 1회 | SUCCESS 50 / SOLD_OUT 450, **오버셀 0**, remaining=0 | ✅ PASS |
| **Draft CRUD** | 50 VU 3분 | GET p95 199ms / PUT p95 236ms, 실패 0.003% | ✅ PASS |
| **Steady** | 200 VU 5분 | p95 2.46s, max 43s, 실패 0.33%(166건) | ⚠️ 병목 |
| **Spike** | 1000 VU 30s | p95 4.97s, 실패 0, throughput ~225 req/s | ⚠️ 병목 |
| Hikari 노출 | — | actuator 메트릭 노출 완료, spike 중 **active=10(포화) / pending 189** | ✅ 완료 |

## 2. 정합성 (최우선 목표) — PASS

- **오버셀 0건**: 500 동시요청에서 `EventRepository.lockById`(`for update`)가 재고를 정확히 방어. 발급 티켓 50 == 초기 재고 50, ticket_number 50개 distinct, SUCCESS 응답 == DB row.
- `verify-oversell.sh`가 DB 실측(티켓 수 vs remaining)으로 PASS/FAIL 직접 판정(정상/오버셀 시뮬 양쪽 검증).
- 상세: `2026-07-13_oversell_race.md`

## 3. 병목 확정 — Hikari 풀 10 + 단일 event row 락

- **물증**: spike(1000 VU) 구간 Hikari `connections.active`가 상한 **10에 고정**되고 `connections.pending`이 **189까지** 상승 → 최대 189 스레드가 커넥션 하나 대기. throughput ~225 req/s로 수렴.
- **이중 직렬화**: 인기 이벤트 단일 row의 `for update` 락 + 풀 max=10. 락을 잡으려면 커넥션부터 잡아야 하므로 풀 크기가 실효 동시 락 획득 수를 제한.
- **지속 부하가 더 위험**: steady(5분)에서 대기 큐가 깊어져 Hikari `connectionTimeout`(기본 30s) 초과 실패 0.33%·max 43s. spike(30s)는 짧아 실패 0. 실오픈(지속 spike)은 둘의 최악을 합친 양상 예상.
- 흐름 확인: `TicketingService`는 event 락을 **먼저** 잡고 DUPLICATE/MAX/SOLD_OUT을 검사 → MAX_PER_USER로 거부되는 요청도 락·커넥션 점유는 동일.
- 상세: `2026-07-13_steady_spike_load.md`

## 4. §10 합격 기준 대비

| 기준 (계획 §10) | 목표 | 실측 | 판정 |
|---|---|---|---|
| 오버셀 | 0건 (필수) | 0건 | ✅ |
| 쓰기 API p95 | ≤ 1s | steady 2.46s / spike 4.97s | ❌ (병목) |
| Draft API p95 | ≤ 300ms | GET 199ms / PUT 236ms | ✅ |
| Draft 409 비율 | 동시편집과 합리적 일치 | N/A — `version`은 JPA @Version 낙관락 아님(단순 +1 카운터), VU당 고유 유저라 경쟟 없음 → 409 미발생(설계상) | ⚠️ 계획 전제 오류 |

> **계획 정정 필요**: §2·§5.5의 "draft optimistic lock(`version`)" 전제는 실제 구현과 불일치. `version`은 저장 시 +1 되는 단순 카운터라 동일 (event,user) 초안 동시 PUT은 409 없이 last-write-wins. §10의 409 기준은 삭제하거나 실제 낙관락 도입 후로 이관.

## 5. 개선 방향 (우선순위순, 별도 검토)

1. **Hikari 풀 크기 상향** (10→20/30) — 가장 직접적. DB 커넥션·CPU 상한과 균형 필요. A/B 재측정 후보.
2. **재고 차감을 원자적 UPDATE** (`update ... set remaining=remaining-1 where remaining>0`) — 락 보유시간 단축, 회전율↑. 단 현 pessimistic 방식이 정합성은 확실.
3. **가상 대기실/큐잉** 앞단 도입 — 백엔드 유입 평활화.

## 6. 미실행 / 계측 한계

- Kafka consumer lag(`ticketing.purchase-results`), Postgres `pg_locks`/`pg_stat_activity` 주기 샘플링(계획 §8.3)은 미수집 — 이번엔 Hikari 풀 메트릭으로 병목 규명. 후속 실험 시 추가.
- `--summary-export`는 기본 퍼센타일(p95)만 기록 → p99 미확보. steady 166 실패 status도 개별 샘플 미저장이라 미확보. 재실행 시 `--out json` 필요.

## 7. 산출물

| 종류 | 경로 |
|---|---|
| k6 시나리오 | `tests/performance/k6/{smoke,oversell-race,draft,steady,spike}.js` |
| 검증/샘플러 | `tests/performance/scripts/{verify-oversell,sample-hikari}.sh`, `issue-tokens.js` |
| 시드 | `tests/performance/seed/{seed,cleanup}.sql`, `scripts/seed.sh` |
| raw 결과 | `tests/performance/results/*.json`, `spike_hikari.csv` |
| 상세 리포트 | `docs/02_Development/01_Reports/performance/2026-07-13_{oversell_race,draft_crud_load,steady_spike_load}.md` |
| 코드 변경 | `HeaderAuthenticationFilter.kt`(draft·actuator scope 매핑), `SecurityConfigTest.kt` |
