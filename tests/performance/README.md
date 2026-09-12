# 부하테스트 실행 자료

계획 문서: `docs/96_Performance_Tests/00_Ticketing_API_Load_Test/00_LOAD_TEST_PLAN.md`

## 1. 시드 데이터 생성

로컬 docker-compose postgres가 떠 있어야 한다 (`docker compose --env-file .env.dev up -d postgres`).

```bash
tests/performance/scripts/seed.sh 50
```

`LOADTEST_SMALL_STOCK`(재고 50), `LOADTEST_LARGE_STOCK`(재고 100000) 이벤트와 테스트 유저 50명을 만들고,
`tests/performance/data/seed-users.csv` / `seed-events.csv`에 실제 DB id를 찍어준다.
기존 dev DB에 이미 row가 있으면 유저 id가 1부터 시작하지 않으니 **csv에 찍힌 id를 그대로 써야 한다** (가정하지 말 것).

정리는 `tests/performance/scripts/cleanup.sh` (FK 자식 테이블부터 역순 삭제 + 로컬 csv/tokens.json도 삭제).

## 2. 토큰 발급

backend가 검증하는 internal JWT를 로그인 없이 직접 사인한다. `.env.dev`의 값과 일치해야 한다.
`--startUid`/`--count`는 위 `seed-users.csv`의 id 범위와 맞춘다.

```bash
INTERNAL_API_JWT_ACTIVE_KID=dev-v1 \
INTERNAL_API_JWT_ACTIVE_SECRET=dev-internal-jwt-secret-key-change-me-1234567890 \
node tests/performance/scripts/issue-tokens.js --count=50 --startUid=3
```

`tests/performance/data/tokens.json` 생성됨. uid가 csv의 실제 id와 안 맞으면 FK 위반으로 쓰기 API가 실패한다.

## 3. Smoke 테스트

`seed-events.csv`에서 `LOADTEST_SMALL_STOCK` 또는 `LOADTEST_LARGE_STOCK`의 id를 EVENT_ID로 쓴다.

```bash
k6 run tests/performance/k6/smoke.js -e EVENT_ID=9 -e BASE_URL=http://localhost:18274
```

`BASE_URL` 기본값은 `.env.dev`의 `BACKEND_PORT=18274`에 맞춰져 있다.

## 4. 오버셀 경쟁 테스트

`LOADTEST_SMALL_STOCK`(재고 50) 대상으로 500 VU가 동시에 1회씩 구매 요청을 쏜다.
VU마다 다른 유저 토큰이 필요하므로 (같은 유저 중복요청은 DUPLICATE_PURCHASE로 결과가 오염됨)
`seed.sh`/`issue-tokens.js`를 **VUS 이상의 user_count/count로** 다시 돌려야 한다.

```bash
tests/performance/scripts/seed.sh 600
node tests/performance/scripts/issue-tokens.js --count=600 --startUid=<seed-users.csv 첫 id>

k6 run tests/performance/k6/oversell-race.js \
  -e EVENT_ID=<LOADTEST_SMALL_STOCK id> -e VUS=500 \
  --out json=tests/performance/results/oversell_race_raw.json

tests/performance/scripts/verify-oversell.sh <EVENT_ID> 50
```

`verify-oversell.sh`가 DB에서 실제 발급된 티켓 수와 `remaining_quantity`를 직접 비교해서
오버셀 발생 여부(PASS/FAIL)를 판정한다 — k6는 HTTP 응답만 보므로 이 단계가 필수다.
PASS/FAIL 로직은 정상 케이스/오버셀 시뮬레이션 둘 다 직접 데이터 박아서 검증함.

## 5. Draft CRUD 테스트

`LOADTEST_ITEMIZED`(booking_mode=ITEMIZED) 이벤트의 예매 초안 GET/PUT latency를 잰다.
draft는 ITEMIZED 이벤트에서만 동작하고(SIMPLE이면 400), PUT item은 실제 event_item이어야 한다.
event_item id는 IDENTITY라 고정할 수 없어 스크립트 `setup()`이 `GET /api/events/{id}`로 활성 item을 자동 조회한다.

`LOADTEST_ITEMIZED`는 discovery_mode=LINK_ONLY라 `GET /api/events` 목록에 안 뜬다.
**`seed-events.csv`에 찍힌 id를 `-e EVENT_ID`로 직접 넘겨야 한다** (이름 자동 조회는 LISTED 이벤트만 가능).

```bash
k6 run tests/performance/k6/draft.js -e EVENT_ID=<LOADTEST_ITEMIZED id> -e VUS=50 -e DURATION=3m \
  --summary-export=tests/performance/results/draft_summary.json
```

VU마다 서로 다른 user 토큰으로 초안을 격리한다. draft의 `version`은 낙관적 락이 아니라 저장 시 +1 되는
단순 카운터라 같은 (event,user) 초안 동시 PUT은 409 없이 last-write-wins로 경쟟한다 — **VUS는 토큰 수 이하로** 둔다.

## 6. Steady / Spike 테스트

`LOADTEST_LARGE_STOCK`(재고 100000, SOLD_OUT 없이 순수 lock latency) 대상. write 경로
(`POST /api/ticketing/requests`)의 지연 분포와 Hikari 풀 경합을 본다. `TicketingService`는
event row 락을 먼저 잡고 DUPLICATE/MAX 검사를 하므로, max_per_user 소진 후 MAX_PER_USER로
바뀌어도 락·커넥션 점유는 동일 → 풀 경합 측정은 유효하다.

```bash
# steady: 200 VU 5분 유지
k6 run tests/performance/k6/steady.js -e EVENT_ID=<LARGE_STOCK id> -e VUS=200 -e DURATION=5m \
  --summary-export=tests/performance/results/steady_summary.json

# spike: 0→1000 VU 10s, 30s 유지 + Hikari 풀 메트릭 동시 폴링
BASE_URL=http://localhost:18274 tests/performance/scripts/sample-hikari.sh 60 1 \
  > tests/performance/results/spike_hikari.csv &
k6 run tests/performance/k6/spike.js -e EVENT_ID=<LARGE_STOCK id> -e VUS=1000 \
  --summary-export=tests/performance/results/spike_summary.json
```

`sample-hikari.sh <반복> <간격초>`는 `/actuator/metrics/hikaricp.connections.{active,idle,pending,max}`를
폴링해 csv로 남긴다. **actuator 접근은 `actuator` scope 토큰이 필요**하다(issue-tokens.js 기본 scope에 포함).
결과 해석은 `docs/02_Development/01_Reports/performance/2026-07-13_steady_spike_load.md` 참고.

## 7. 다음 단계

- Hikari 풀 크기 20/30 A/B 재측정 (pending·p95 이동 관찰)
- raw 데이터 저장 규칙은 계획 문서 8번 참고
