#!/usr/bin/env bash
# oversell-race.js 실행 후 DB 정합성(오버셀 0건)을 직접 확인.
# k6는 HTTP 응답만 보므로, 실제로 DB에 박힌 row 수가 시딩한 재고를 넘었는지는 여기서 봐야 한다.
#
# 사용:
#   tests/performance/scripts/verify-oversell.sh <event_id> <initial_stock>
#
# 예:
#   tests/performance/scripts/verify-oversell.sh 9 50

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

EVENT_ID="${1:?event_id 필요}"
INITIAL_STOCK="${2:?initial_stock 필요 (seed.sql의 remaining_quantity 초기값)}"

set -a
source .env.dev
set +a

RESULT="$(docker compose --env-file .env.dev exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -F',' -c \
  "select count(*), (select remaining_quantity from events where id = $EVENT_ID) from tickets where event_id = $EVENT_ID")"

TICKET_COUNT="$(echo "$RESULT" | cut -d',' -f1)"
REMAINING="$(echo "$RESULT" | cut -d',' -f2)"

echo "event_id=$EVENT_ID initial_stock=$INITIAL_STOCK actual_ticket_count=$TICKET_COUNT remaining_quantity=$REMAINING"

if [ "$TICKET_COUNT" -gt "$INITIAL_STOCK" ]; then
  echo "FAIL: 오버셀 발생 - 발급된 티켓($TICKET_COUNT)이 초기 재고($INITIAL_STOCK)를 초과함"
  exit 1
fi

if [ "$REMAINING" -lt 0 ]; then
  echo "FAIL: remaining_quantity 음수 ($REMAINING)"
  exit 1
fi

if [ "$((INITIAL_STOCK - TICKET_COUNT))" -ne "$REMAINING" ]; then
  echo "FAIL: 재고 차감 불일치 - initial($INITIAL_STOCK) - sold($TICKET_COUNT) != remaining($REMAINING)"
  exit 1
fi

echo "PASS: 오버셀 없음, 재고 정합성 일치"
