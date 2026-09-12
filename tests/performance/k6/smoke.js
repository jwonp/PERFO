// Smoke test: 토큰/시드 데이터/네트워크 경로가 정상인지 1회씩만 확인.
// 부하 측정 목적이 아니라 본격 시나리오(오버셀 race, steady load 등) 실행 전 사전 점검용.
//
// 실행:
//   k6 run tests/performance/k6/smoke.js -e EVENT_ID=1
//
// 사전조건: tests/performance/scripts/issue-tokens.js 로 tests/performance/data/tokens.json 생성 완료.

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18274';
const EVENT_ID = __ENV.EVENT_ID || '1';
const TOKENS_FILE = __ENV.TOKENS_FILE || '../data/tokens.json';

const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open(TOKENS_FILE));
});

// 비즈니스 결과(SUCCESS/SOLD_OUT/...)는 HTTP status에 안 드러나므로 별도 카운터로 기록.
const ticketingResult = new Counter('ticketing_result');

export const options = {
  vus: 1,
  iterations: 1,
};

function params(token, endpoint) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { headers, tags: { endpoint } };
}

export default function () {
  const user = tokens[0];

  let res = http.get(`${BASE_URL}/api/health`, params(null, 'health'));
  check(res, { 'health 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/events`, params(null, 'events_list'));
  check(res, { 'events_list 200': (r) => r.status === 200 });

  res = http.get(
    `${BASE_URL}/api/ticketing/events/${EVENT_ID}/projection`,
    params(user.token, 'ticketing_projection'),
  );
  check(res, { 'ticketing_projection 200': (r) => r.status === 200 });

  res = http.get(`${BASE_URL}/api/tickets`, params(user.token, 'tickets_list'));
  check(res, { 'tickets_list 200': (r) => r.status === 200 });

  const requestId = `smoke-${Date.now()}-${user.uid}`;
  res = http.post(
    `${BASE_URL}/api/ticketing/requests`,
    JSON.stringify({ requestId, eventId: Number(EVENT_ID), quantity: 1 }),
    params(user.token, 'ticketing_requests'),
  );
  check(res, { 'ticketing_requests responded': (r) => r.status === 200 || r.status === 400 });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    ticketingResult.add(1, { result: body.result });
    console.log(`ticketing_requests result=${body.result} requestId=${requestId}`);
  } else {
    console.log(`ticketing_requests failed status=${res.status} body=${res.body}`);
  }
}
