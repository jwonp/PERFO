# Draft CRUD 부하테스트 결과 — 2026-07-13

계획: `docs/96_Performance_Tests/00_Ticketing_API_Load_Test/00_LOAD_TEST_PLAN.md` §5.5 Draft 시나리오
스크립트: `tests/performance/k6/draft.js`
raw 요약: `tests/performance/results/draft_summary.json`

## 1. 대상 / 환경

| 항목 | 값 |
|---|---|
| API | `GET /api/events/{id}/draft`, `PUT /api/events/{id}/draft` (scope=ticketing) |
| 이벤트 | `LOADTEST_ITEMIZED` (booking_mode=ITEMIZED, event_items 4개) |
| 실행 방식 | 로컬 docker-compose 풀스택 (backend `full` 프로필 + postgres/kafka/redis/minio) |
| backend | Spring Boot 3.4.3, Hikari 기본 풀(max 10) |
| 부하 | k6 ramping-vus, 0→50 VU 15s ramp → 50 VU 3m hold → 15s ramp-down |
| 토큰 | 유저별 internal JWT 50개(VU당 고유 유저로 초안 격리) |

## 2. 결과 (PASS)

| 지표 | 값 | threshold | 판정 |
|---|---|---|---|
| iterations | 65,152 (309.8/s) | — | — |
| http_reqs | 130,305 (619.6/s) | — | — |
| checks 성공률 | 99.998% (260,604/260,608) | rate>0.99 | ✅ |
| draft_get p95 / p99 | 199.1ms / — | p95<500, p99<1000 | ✅ |
| draft_put p95 / p99 | 235.5ms / 492.0ms | p95<800, p99<1500 | ✅ |
| http_req_duration 전체 p95 | 218.1ms (avg 74.6ms, max 1.99s) | — | — |
| draft_get 실패율 | 0.00% (0/65,152) | rate<0.01 | ✅ |
| draft_put 실패율 | 0.003% (2/65,152) | rate<0.01 | ✅ |

## 3. 관찰

- 50 VU 정상 부하에서 GET/PUT 모두 sub-250ms p95. draft 저장은 삭제-후-삽입(item 교체) + version+1이라 read보다 약간 무겁지만 차이 작음.
- **꼬리 지연**: max ~2s. avg 75ms 대비 큰 꼬리 → 순간적 커넥션 풀 대기 의심(Hikari max 10 기본). draft_put 2건 실패도 같은 원인(풀 대기/타임아웃)으로 추정. 재현 안 될 수준(0.003%).
- draft `version`은 JPA @Version 낙관적 락이 아니라 단순 +1 카운터. VU당 고유 유저라 동일 초안 동시편집 경쟟 없음 → 409 미발생(설계상 없음).

## 4. 후속

- [ ] Hikari 풀 메트릭(actuator/prometheus active/idle/pending) 노출 확인 후 spike 테스트에서 꼬리 지연 원인 확정
- [ ] draft_put 2건 실패 status 확보하려면 재실행 시 k6 stdout 전체 보존(`tail` 금지) 또는 `--out json`으로 개별 샘플 저장
- [ ] steady/spike 시나리오와 동일 리포트 포맷으로 이어서 측정
