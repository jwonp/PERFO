#!/usr/bin/env bash
# 부하 실행 동안 Hikari 풀 메트릭을 주기적으로 폴링해 active/idle/pending 시계열을 찍는다.
# spike 테스트의 pending 피크(풀 고갈 큐잉)를 잡는 게 목적.
#
# 사용: tests/performance/scripts/sample-hikari.sh <반복횟수> <간격초>
#   예) sample-hikari.sh 60 1   # 1초 간격 60회 = 60초
# 백그라운드로 띄우고 k6를 돌린 뒤 출력(csv)을 결과 디렉토리에 남긴다.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:18274}"
TOKENS_FILE="${TOKENS_FILE:-$(cd "$(dirname "$0")/../data" && pwd)/tokens.json}"
COUNT="${1:-60}"
INTERVAL="${2:-1}"

TOKEN=$(node -e "const t=require('$TOKENS_FILE'); process.stdout.write(t[0].token)")

metric() { # $1=metric name -> value
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/actuator/metrics/$1" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(String(JSON.parse(s).measurements[0].value))}catch(e){process.stdout.write('NaN')}})"
}

echo "ts,active,idle,pending,max"
for ((i = 0; i < COUNT; i++)); do
  ts=$(date +%s)
  a=$(metric hikaricp.connections.active)
  d=$(metric hikaricp.connections.idle)
  p=$(metric hikaricp.connections.pending)
  m=$(metric hikaricp.connections.max)
  echo "$ts,$a,$d,$p,$m"
  sleep "$INTERVAL"
done
