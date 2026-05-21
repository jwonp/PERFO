#!/usr/bin/env bash
#
# Usage:
#   ./scripts/switch-traffic.sh <blue|green> [--env-file .env]
#
# Required env in the shell or env file:
#   none beyond docker compose connectivity

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <blue|green> [--env-file .env]" >&2
  exit 1
fi

TARGET_COLOR="$1"
shift

ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 <blue|green> [--env-file .env]" >&2
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${TARGET_COLOR}" != "blue" && "${TARGET_COLOR}" != "green" ]]; then
  echo "target color must be blue or green" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

COMPOSE_ARGS=(
  --env-file "${ENV_FILE}"
  -f docker-compose.yml
  -f docker-compose.bluegreen.yml
  --profile bluegreen
)

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

SOURCE_FILE="${PROJECT_ROOT}/deploy/nginx/upstreams/frontend-${TARGET_COLOR}.conf"
ACTIVE_DIR="${PROJECT_ROOT}/deploy/nginx/upstreams/active"
ACTIVE_FILE="${ACTIVE_DIR}/frontend-active.conf"

if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "Missing nginx upstream file: ${SOURCE_FILE}" >&2
  exit 1
fi

mkdir -p "${ACTIVE_DIR}"
cp "${SOURCE_FILE}" "${ACTIVE_FILE}"

compose up -d --force-recreate nginx

echo "Traffic switched to ${TARGET_COLOR}."
