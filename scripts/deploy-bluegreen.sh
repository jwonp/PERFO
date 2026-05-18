#!/usr/bin/env bash
#
# Usage:
#   ./scripts/deploy-bluegreen.sh --frontend-tag <tag> --backend-tag <tag> [--target-color blue|green] [--env-file .env]
#
# Required env in the shell or env file:
#   FRONTEND_IMAGE_REPOSITORY
#   BACKEND_IMAGE_REPOSITORY
#
# Optional env:
#   NGINX_PORT
#   FRONTEND_BLUE_HOST_PORT
#   FRONTEND_GREEN_HOST_PORT
#   BACKEND_BLUE_HOST_PORT
#   BACKEND_GREEN_HOST_PORT

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE=".env"
TARGET_COLOR=""
FRONTEND_TAG=""
BACKEND_TAG=""

usage() {
  echo "Usage: $0 --frontend-tag <tag> --backend-tag <tag> [--target-color blue|green] [--env-file .env]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend-tag)
      FRONTEND_TAG="${2:-}"
      shift 2
      ;;
    --backend-tag)
      BACKEND_TAG="${2:-}"
      shift 2
      ;;
    --target-color)
      TARGET_COLOR="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${FRONTEND_TAG}" || -z "${BACKEND_TAG}" ]]; then
  usage
  exit 1
fi

cd "${PROJECT_ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${FRONTEND_IMAGE_REPOSITORY:?FRONTEND_IMAGE_REPOSITORY must be set}"
: "${BACKEND_IMAGE_REPOSITORY:?BACKEND_IMAGE_REPOSITORY must be set}"

COMPOSE_ARGS=(
  --env-file "${ENV_FILE}"
  -f docker-compose.yml
  -f docker-compose.bluegreen.yml
  --profile bluegreen
)

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

ACTIVE_FILE="${PROJECT_ROOT}/deploy/nginx/upstreams/active/frontend-active.conf"

detect_active_color() {
  if grep -q "frontend_green" "${ACTIVE_FILE}"; then
    echo "green"
  else
    echo "blue"
  fi
}

inactive_color() {
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
  for attempt in $(seq 1 30); do
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
  TARGET_COLOR="$(inactive_color "${CURRENT_COLOR}")"
fi

if [[ "${TARGET_COLOR}" != "blue" && "${TARGET_COLOR}" != "green" ]]; then
  echo "target color must be blue or green" >&2
  exit 1
fi

if [[ "${TARGET_COLOR}" == "blue" ]]; then
  BACKEND_SERVICE="backend_blue"
  FRONTEND_SERVICE="frontend_blue"
  BACKEND_HOST_PORT="${BACKEND_BLUE_HOST_PORT:-8274}"
  FRONTEND_HOST_PORT="${FRONTEND_BLUE_HOST_PORT:-4138}"
  export BACKEND_BLUE_IMAGE_TAG="${BACKEND_TAG}"
  export FRONTEND_BLUE_IMAGE_TAG="${FRONTEND_TAG}"
else
  BACKEND_SERVICE="backend_green"
  FRONTEND_SERVICE="frontend_green"
  BACKEND_HOST_PORT="${BACKEND_GREEN_HOST_PORT:-8275}"
  FRONTEND_HOST_PORT="${FRONTEND_GREEN_HOST_PORT:-4139}"
  export BACKEND_GREEN_IMAGE_TAG="${BACKEND_TAG}"
  export FRONTEND_GREEN_IMAGE_TAG="${FRONTEND_TAG}"
fi

echo "Current active color: ${CURRENT_COLOR}"
echo "Deploying target color: ${TARGET_COLOR}"

compose pull "${BACKEND_SERVICE}" "${FRONTEND_SERVICE}"
compose up -d "${BACKEND_SERVICE}"
wait_for_http "http://127.0.0.1:${BACKEND_HOST_PORT}/api/health" "${BACKEND_SERVICE}"

compose up -d "${FRONTEND_SERVICE}" nginx
wait_for_http "http://127.0.0.1:${FRONTEND_HOST_PORT}/api/health" "${FRONTEND_SERVICE}"

bash "${SCRIPT_DIR}/switch-traffic.sh" "${TARGET_COLOR}" --env-file "${ENV_FILE}"

echo "Blue-green deployment completed. Active color is now ${TARGET_COLOR}."
