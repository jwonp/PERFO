// Draft CRUD 부하 시나리오: itemized 이벤트의 예매 초안(BookingDraft) GET/PUT latency 측정.
//
// 대상 API:
//   GET /api/events/{id}/draft   (scope=ticketing)  - 현재 초안 조회
//   PUT /api/events/{id}/draft   (scope=ticketing)  - 초안 저장(item 목록 교체)
//
// 중요:
//   - draft는 booking_mode=ITEMIZED 이벤트에서만 동작한다(BookingDraftService). SIMPLE 이벤트로는 400.
//   - PUT items의 eventItemId는 실제 event_items 행이어야 한다(booking_draft_items FK).
//     event_item id는 IDENTITY라 고정값을 못 박고 setup()에서 GET /api/events/{id}로 활성 item을 조회한다.
//   - draft의 version은 JPA @Version 낙관적 락이 아니라 저장 시 +1 되는 단순 카운터다.
//     동일 (event,user) 초안에 대한 동시 PUT은 409를 내지 않고 last-write-wins로 경쟟한다.
//     따라서 이 시나리오는 VU마다 서로 다른 user 토큰을 써서 초안을 격리한다(VUS <= 토큰 수 권장).
//
// 실행:
//   k6 run tests/performance/k6/draft.js
//   k6 run tests/performance/k6/draft.js -e VUS=50 -e DURATION=3m
//   k6 run tests/performance/k6/draft.js -e EVENT_ID=7   // 이름 조회 대신 id 직접 지정
//
// 사전조건:
//   - seed.sql로 LOADTEST_ITEMIZED 이벤트 + event_items 생성
//   - issue-tokens.js로 tests/performance/data/tokens.json 생성(scope에 ticketing 포함)

import http from 'k6/http';
import { check, fail } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18274';
const EVENT_ID = __ENV.EVENT_ID || '';
const EVENT_NAME = __ENV.EVENT_NAME || 'LOADTEST_ITEMIZED';
const TOKENS_FILE = __ENV.TOKENS_FILE || '../data/tokens.json';
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '1m';
const RAMP = __ENV.RAMP || '15s';

const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open(TOKENS_FILE));
});

export const options = {
  scenarios: {
    draft_crud: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP, target: VUS },
        { duration: DURATION, target: VUS },
        { duration: RAMP, target: 0 },
      ],
      gracefulStop: '10s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    'http_req_failed{endpoint:draft_get}': ['rate<0.01'],
    'http_req_failed{endpoint:draft_put}': ['rate<0.01'],
    'http_req_duration{endpoint:draft_get}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:draft_put}': ['p(95)<800', 'p(99)<1500'],
  },
};

function params(token, endpoint) {
  return {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    tags: { endpoint },
  };
}

// setup: itemized 이벤트 id와 활성 event_item id 목록을 조회해 전체 VU에 공유한다.
export function setup() {
  if (tokens.length === 0) {
    fail('tokens.json이 비어있음 - issue-tokens.js로 먼저 생성');
  }
  const probeToken = tokens[0].token;

  let eventId = EVENT_ID;
  if (!eventId) {
    const listRes = http.get(`${BASE_URL}/api/events`, params(probeToken, 'setup_events'));
    if (listRes.status !== 200) {
      fail(`GET /api/events 실패 status=${listRes.status} body=${listRes.body}`);
    }
    // 주의: GET /api/events는 LISTED discovery 이벤트만 반환한다. LOADTEST_ITEMIZED는
    // LINK_ONLY라 목록에 안 뜬다 → 보통 seed-events.csv의 id를 -e EVENT_ID로 직접 넘겨야 한다.
    const event = JSON.parse(listRes.body).find((e) => e.name === EVENT_NAME);
    if (!event) {
      fail(`이벤트 '${EVENT_NAME}' 목록에 없음(LINK_ONLY면 정상) - seed-events.csv의 id를 -e EVENT_ID=<id>로 넘겨라`);
    }
    eventId = String(event.id);
  }

  const detailRes = http.get(`${BASE_URL}/api/events/${eventId}`, params(probeToken, 'setup_event_detail'));
  if (detailRes.status !== 200) {
    fail(`GET /api/events/${eventId} 실패 status=${detailRes.status} body=${detailRes.body}`);
  }
  const detail = JSON.parse(detailRes.body);
  if (detail.bookingMode !== 'ITEMIZED') {
    fail(`이벤트 ${eventId} bookingMode=${detail.bookingMode} (ITEMIZED 아니면 draft가 400)`);
  }
  const itemIds = (detail.items || []).filter((it) => it.active).map((it) => it.id);
  if (itemIds.length === 0) {
    fail(`이벤트 ${eventId}에 활성 event_item 없음 - seed.sql 확인`);
  }

  console.log(`draft 대상 eventId=${eventId} itemIds=[${itemIds.join(',')}] tokens=${tokens.length} vus=${VUS}`);
  return { eventId, itemIds };
}

// items의 랜덤 부분집합(1개 이상) + quantity 1..3 생성.
function randomItems(itemIds) {
  const count = 1 + Math.floor(Math.random() * itemIds.length);
  const shuffled = [...itemIds].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((eventItemId) => ({ eventItemId, quantity: 1 + Math.floor(Math.random() * 3) }));
}

export default function (data) {
  // VU마다 고정 user를 매핑해 초안을 격리한다(같은 user 동시편집 경쟟 회피).
  const user = tokens[(__VU - 1) % tokens.length];
  const draftUrl = `${BASE_URL}/api/events/${data.eventId}/draft`;

  const getRes = http.get(draftUrl, params(user.token, 'draft_get'));
  check(getRes, {
    'draft_get 200': (r) => r.status === 200,
    'draft_get has version': (r) => r.status === 200 && JSON.parse(r.body).version !== undefined,
  });

  const putRes = http.put(
    draftUrl,
    JSON.stringify({ items: randomItems(data.itemIds) }),
    params(user.token, 'draft_put'),
  );
  const putOk = check(putRes, {
    'draft_put 200': (r) => r.status === 200,
    'draft_put version incremented': (r) => {
      if (r.status !== 200) return false;
      const before = getRes.status === 200 ? JSON.parse(getRes.body).version : 0;
      return JSON.parse(r.body).version > before;
    },
  });

  if (!putOk) {
    console.log(`draft_put 실패 uid=${user.uid} status=${putRes.status} body=${putRes.body}`);
  }
}
