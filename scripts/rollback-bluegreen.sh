#!/usr/bin/env bash
#
# Usage:
#   ./scripts/rollback-bluegreen.sh [--target-color blue|green] [--env-file .env]
#
# Required env in the shell or env file:
#   none beyond docker compose connectivity

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE=".env"
TARGET_COLOR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-color)
      TARGET_COLOR="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--target-color blue|green] [--env-file .env]" >&2
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

cd "${PROJECT_ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

ACTIVE_FILE="${PROJECT_ROOT}/deploy/nginx/upstreams/active/frontend-active.conf"

detect_active_color() {
  if grep -q "frontend_green" "${ACTIVE_FILE}"; then
    echo "green"
  else
    echo "blue"
  fi
}

opposite_color() {
  if [[ "$1" == "blue" ]]; then
    echo "green"
  else
    echo "blue"
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempt
  for attempt in $(seq 1 15); do
    if curl -fsS "${url}" >/dev/null; then
      echo "${label} is healthy: ${url}"
      return 0
    fi
    sleep 2
  done

  echo "${label} health check failed: ${url}" >&2
  return 1
}

CURRENT_COLOR="$(detect_active_color)"
if [[ -z "${TARGET_COLOR}" ]]; then
  TARGET_COLOR="$(opposite_color "${CURRENT_COLOR}")"
fi

if [[ "${TARGET_COLOR}" != "blue" && "${TARGET_COLOR}" != "green" ]]; then
  echo "target color must be blue or green" >&2
  exit 1
fi

if [[ "${TARGET_COLOR}" == "blue" ]]; then
  BACKEND_HOST_PORT="${BACKEND_BLUE_HOST_PORT:-8274}"
  FRONTEND_HOST_PORT="${FRONTEND_BLUE_HOST_PORT:-4138}"
else
  BACKEND_HOST_PORT="${BACKEND_GREEN_HOST_PORT:-8275}"
  FRONTEND_HOST_PORT="${FRONTEND_GREEN_HOST_PORT:-4139}"
fi

wait_for_http "http://127.0.0.1:${BACKEND_HOST_PORT}/api/health" "rollback backend ${TARGET_COLOR}"
wait_for_http "http://127.0.0.1:${FRONTEND_HOST_PORT}/api/health" "rollback frontend ${TARGET_COLOR}"

bash "${SCRIPT_DIR}/switch-traffic.sh" "${TARGET_COLOR}" --env-file "${ENV_FILE}"

echo "Rollback completed. Active color is now ${TARGET_COLOR}."
