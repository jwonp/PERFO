// Steady load: 200 VU를 5분간 꾸준히 유지하며 티켓팅 write 경로(POST /api/ticketing/requests)
// latency 분포와 Hikari 풀 경합을 관찰한다. 대상은 LOADTEST_LARGE_STOCK(재고 100000)이라
// 재고 고갈(SOLD_OUT)로 인한 분기 오염 없이 pessimistic lock 직렬화 지연만 순수하게 본다.
//
// 실행:
//   k6 run tests/performance/k6/steady.js -e EVENT_ID=17 -e VUS=200 -e DURATION=5m \
//     --summary-export=tests/performance/results/steady_summary.json
//
// 사전조건: issue-tokens.js 로 tokens.json 생성(VUS 이하 아님 — 유저 재사용은 max_per_user=10
// 소진 후 MAX_PER_USER_EXCEEDED로 결과가 바뀐다. lock 경로 latency는 동일하므로 측정은 유효하나
// result 분포는 그 점을 감안해 해석한다).

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18274';
const EVENT_ID = __ENV.EVENT_ID;
const VUS = Number(__ENV.VUS || 200);
const DURATION = __ENV.DURATION || '5m';
const TOKENS_FILE = __ENV.TOKENS_FILE || '../data/tokens.json';

if (!EVENT_ID) {
  throw new Error('EVENT_ID 필수 (seed-events.csv의 LOADTEST_LARGE_STOCK id를 -e EVENT_ID로 넘길 것)');
}

const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open(TOKENS_FILE));
});

const ticketingResult = new Counter('ticketing_result');
const requestTrend = new Trend('ticketing_request_duration', true);

export const options = {
  scenarios: {
    steady: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: VUS },
        { duration: DURATION, target: VUS },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    ticketing_request_duration: ['p(95)<2000', 'p(99)<4000'],
    http_req_failed: ['rate<0.01'],
  },
};

function params(token) {
  return {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    tags: { endpoint: 'ticketing_requests' },
  };
}

export default function () {
  const user = tokens[__VU % tokens.length];
  const requestId = `steady-${__VU}-${__ITER}-${Date.now()}`;

  const res = http.post(
    `${BASE_URL}/api/ticketing/requests`,
    JSON.stringify({ requestId, eventId: Number(EVENT_ID), quantity: 1 }),
    params(user.token),
  );

  requestTrend.add(res.timings.duration);
  check(res, { 'ticketing_requests 200': (r) => r.status === 200 });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    ticketingResult.add(1, { result: body.result });
  }
}
