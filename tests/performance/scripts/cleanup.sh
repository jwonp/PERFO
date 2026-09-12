#!/usr/bin/env bash
# seed.sh로 만든 데이터 + 테스트 도중 쌓인 row 전부 제거.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

set -a
source .env.dev
set +a

docker compose --env-file .env.dev exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f - < tests/performance/seed/cleanup.sql

rm -f tests/performance/data/seed-users.csv tests/performance/data/seed-events.csv tests/performance/data/tokens.json

echo "클린업 완료."
