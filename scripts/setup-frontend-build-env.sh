#!/usr/bin/env bash
#
# Usage:
#   bash ./scripts/setup-frontend-build-env.sh [--env-file .env] [--mode full|bluegreen]
#
# Purpose:
#   - Load deployment env from an env file
#   - Verify NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is present before a frontend build
#   - Rebuild frontend image(s) so the public key is embedded at Next.js build time

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE=".env"
MODE="bluegreen"

usage() {
  cat <<'EOF' >&2
Usage: bash ./scripts/setup-frontend-build-env.sh [options]

Options:
  --env-file <path>         Env file to load (default: .env)
  --mode <full|bluegreen>   Compose target to rebuild (default: bluegreen)
  -h, --help                Show this help

Examples:
  bash ./scripts/setup-frontend-build-env.sh
  bash ./scripts/setup-frontend-build-env.sh --env-file .env.prod --mode bluegreen
  bash ./scripts/setup-frontend-build-env.sh --env-file .env --mode full
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
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

if [[ "${MODE}" != "full" && "${MODE}" != "bluegreen" ]]; then
  echo "--mode must be one of: full, bluegreen" >&2
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

: "${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:?NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be set for frontend production builds}"

mask_value() {
  local value="$1"
  local length="${#value}"

  if (( length <= 8 )); then
    printf '%s\n' '********'
    return 0
  fi

  printf '%s...%s\n' "${value:0:4}" "${value:length-4:4}"
}

if [[ "${MODE}" == "full" ]]; then
  COMPOSE_ARGS=(
    --env-file "${ENV_FILE}"
    -f docker-compose.yml
    --profile full
  )
  SERVICES=(frontend)
else
  COMPOSE_ARGS=(
    --env-file "${ENV_FILE}"
    -f docker-compose.yml
    -f docker-compose.bluegreen.yml
    --profile bluegreen
  )
  SERVICES=(frontend_blue frontend_green)
fi

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

echo "Preparing frontend build environment"
echo "  project root : ${PROJECT_ROOT}"
echo "  env file     : ${ENV_FILE}"
echo "  mode         : ${MODE}"
echo "  key          : $(mask_value "${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}")"
echo "  services     : ${SERVICES[*]}"

compose build "${SERVICES[@]}"

echo "Frontend build setup completed."
