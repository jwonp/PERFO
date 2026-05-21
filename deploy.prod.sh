#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"

ENV_FILE=".env"
COMMON_TAG="${PROD_IMAGE_TAG:-prod}"
FRONTEND_TAG=""
BACKEND_TAG=""
TARGET_COLOR=""

usage() {
  cat <<'EOF' >&2
Usage: ./deploy.prod.sh [options]

Options:
  --tag <tag>                 Set both frontend/backend image tags
  --frontend-tag <tag>        Override frontend image tag
  --backend-tag <tag>         Override backend image tag
  --target-color <blue|green> Force blue-green deployment target
  --env-file <path>           Env file to load (default: .env)
  -h, --help                  Show this help

Defaults:
  - If no tag is provided, both services deploy with PROD_IMAGE_TAG or "prod".
  - The actual deployment is delegated to ./scripts/deploy-bluegreen.sh.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      COMMON_TAG="${2:-}"
      shift 2
      ;;
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

if [[ -z "${COMMON_TAG}" ]]; then
  echo "Image tag must not be empty." >&2
  exit 1
fi

if [[ -z "${FRONTEND_TAG}" ]]; then
  FRONTEND_TAG="${COMMON_TAG}"
fi

if [[ -z "${BACKEND_TAG}" ]]; then
  BACKEND_TAG="${COMMON_TAG}"
fi

cd "${PROJECT_ROOT}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

DEPLOY_CMD=(
  bash
  "${PROJECT_ROOT}/scripts/deploy-bluegreen.sh"
  --env-file "${ENV_FILE}"
  --frontend-tag "${FRONTEND_TAG}"
  --backend-tag "${BACKEND_TAG}"
)

if [[ -n "${TARGET_COLOR}" ]]; then
  DEPLOY_CMD+=(--target-color "${TARGET_COLOR}")
fi

echo "Starting PERFO production deployment"
echo "  env file      : ${ENV_FILE}"
echo "  frontend tag  : ${FRONTEND_TAG}"
echo "  backend tag   : ${BACKEND_TAG}"
if [[ -n "${TARGET_COLOR}" ]]; then
  echo "  target color  : ${TARGET_COLOR}"
else
  echo "  target color  : auto"
fi

"${DEPLOY_CMD[@]}"
