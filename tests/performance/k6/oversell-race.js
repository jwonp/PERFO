// 오버셀 경쟁 테스트: 재고 적은 이벤트(LOADTEST_SMALL_STOCK, 기본 재고 50)에 N개 VU가
// 거의 동시에 1회씩 구매 요청을 쏴서, EventRepository의 pessimistic lock(for update)이
// 동시성 하에서도 재고를 정확히 지키는지 검증한다.
//
// 목적은 latency가 아니라 정합성: SUCCESS 합계가 시딩한 재고 수를 절대 넘지 않아야 한다.
// VU마다 별도 유저 토큰을 써야 한다 (같은 유저로 중복 요청하면 DUPLICATE_PURCHASE로
// 섞여서 진짜 오버셀 여부를 가리게 됨) -> tokens.json 토큰 수 >= VUS 필요.
//
// 실행:
//   k6 run tests/performance/k6/oversell-race.js \
//     -e EVENT_ID=9 -e BASE_URL=http://localhost:18274 -e VUS=500 \
//     --out json=tests/performance/results/oversell_race_raw.json \
//     --summary-export=tests/performance/results/oversell_race_summary.json
//
// 실행 후 tests/performance/scripts/verify-oversell.sh <EVENT_ID> <INITIAL_STOCK> 로
// DB 정합성(오버셀 0건)을 직접 확인해야 한다 — k6만으로는 DB를 못 본다.

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:18274';
const EVENT_ID = Number(__ENV.EVENT_ID || '0');
const TOKENS_FILE = __ENV.TOKENS_FILE || '../data/tokens.json';
const VUS = Number(__ENV.VUS || 500);

if (!EVENT_ID) {
  throw new Error('EVENT_ID 필요 (LOADTEST_SMALL_STOCK 이벤트 id, seed-events.csv 참고)');
}

const tokens = new SharedArray('tokens', function () {
  const data = JSON.parse(open(TOKENS_FILE));
  if (data.length < VUS) {
    throw new Error(`tokens.json 토큰 수(${data.length})가 VUS(${VUS})보다 적음 - 같은 유저 중복요청은 DUPLICATE_PURCHASE로 결과를 오염시킴`);
  }
  return data;
});

const ticketingResult = new Counter('ticketing_result');

export const options = {
  scenarios: {
    oversell_race: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  // 빈 threshold([])는 pass/fail 조건 없이 result 태그별 submetric을 강제로 만들어서
  // handleSummary에서 결과 분포(SUCCESS/SOLD_OUT/...)를 바로 읽을 수 있게 하는 용도.
  thresholds: {
    'ticketing_result{result:SUCCESS}': [],
    'ticketing_result{result:SOLD_OUT}': [],
    'ticketing_result{result:DUPLICATE_PURCHASE}': [],
    'ticketing_result{result:MAX_PER_USER_EXCEEDED}': [],
  },
};

export default function () {
  // VU 번호(1-base)로 토큰을 1:1 매핑해 VU당 정확히 다른 유저 1명을 쓴다.
  const user = tokens[(__VU - 1) % tokens.length];
  const requestId = `race-${EVENT_ID}-${user.uid}-${__VU}`;

  const res = http.post(
    `${BASE_URL}/api/ticketing/requests`,
    JSON.stringify({ requestId, eventId: EVENT_ID, quantity: 1 }),
    {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'ticketing_requests', scenario: 'oversell_race' },
    },
  );

  check(res, { 'http 200': (r) => r.status === 200 });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    ticketingResult.add(1, { result: body.result });
  } else {
    ticketingResult.add(1, { result: `HTTP_${res.status}` });
    console.log(`vu=${__VU} uid=${user.uid} failed status=${res.status} body=${res.body}`);
  }
}

export function handleSummary(data) {
  const resultTypes = ['SUCCESS', 'SOLD_OUT', 'DUPLICATE_PURCHASE', 'MAX_PER_USER_EXCEEDED'];
  const counts = {};
  for (const result of resultTypes) {
    const metric = data.metrics[`ticketing_result{result:${result}}`];
    counts[result] = metric ? metric.values.count : 0;
  }

  const summary = { eventId: EVENT_ID, vus: VUS, counts };
  const json = JSON.stringify(summary, null, 2);

  return {
    stdout: `\n=== oversell-race result counts ===\n${json}\n`,
    'tests/performance/results/oversell_race_result_counts.json': json,
  };
}
