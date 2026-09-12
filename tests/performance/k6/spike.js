// Spike: 10초 만에 0→1000 VU로 급증시켜 30초 유지. 티켓오픈 순간의 급격한 동시성 폭증을
// 재현해 단일 event row의 pessimistic lock 경합이 Hikari 풀(기본 max 10) pending/큐잉으로
// 어떻게 나타나는지, p99 꼬리 지연이 얼마나 벌어지는지 관찰한다.
// 대상은 LOADTEST_LARGE_STOCK(재고 100000)이라 SOLD_OUT 없이 순수 lock 병목만 본다.
//
// 실행:
//   k6 run tests/performance/k6/spike.js -e EVENT_ID=17 -e VUS=1000 \
//     --summary-export=tests/performance/results/spike_summary.json
//
// 동시에 Hikari 메트릭을 별도로 폴링(scripts/sample-hikari.sh)해서 pending 피크를 잡는다.

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18274';
const EVENT_ID = __ENV.EVENT_ID;
const VUS = Number(__ENV.VUS || 1000);
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
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: VUS },
        { duration: '30s', target: VUS },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // spike는 병목 관찰이 목적이라 threshold는 느슨하게 두되 완전 실패(5xx/timeout)만 잡는다.
    http_req_failed: ['rate<0.05'],
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
  const requestId = `spike-${__VU}-${__ITER}-${Date.now()}`;

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
