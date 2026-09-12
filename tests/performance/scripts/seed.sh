#!/usr/bin/env bash
# 부하테스트용 시드 데이터 생성. 로컬 docker-compose postgres 컨테이너에 직접 psql로 적용한다.
#
# 사용:
#   tests/performance/scripts/seed.sh [user_count]
#
# 끝나면 tests/performance/data/seed-users.csv, seed-events.csv 생성됨.
# issue-tokens.js --startUid / --count 를 seed-users.csv의 id 범위에 맞춰서 실행해라.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

set -a
source .env.dev
set +a

USER_COUNT="${1:-50}"
DATA_DIR="tests/performance/data"
mkdir -p "$DATA_DIR"

docker compose --env-file .env.dev exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v "user_count=$USER_COUNT" \
  -f - < tests/performance/seed/seed.sql

docker compose --env-file .env.dev exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "copy (select id, email from users where email like 'load-test-user-%@perfo.test' order by id) to stdout with csv header" \
  > "$DATA_DIR/seed-users.csv"

docker compose --env-file .env.dev exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "copy (select id, name, remaining_quantity from events where name in ('LOADTEST_SMALL_STOCK','LOADTEST_LARGE_STOCK','LOADTEST_ITEMIZED') order by name) to stdout with csv header" \
  > "$DATA_DIR/seed-events.csv"

echo "시드 완료:"
column -s, -t "$DATA_DIR/seed-users.csv" | head -3
echo "..."
column -s, -t "$DATA_DIR/seed-events.csv"
