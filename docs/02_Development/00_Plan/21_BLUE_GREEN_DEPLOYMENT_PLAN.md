# PERFO Docker Compose Blue-Green 배포 계획

## 1. 목표

- 현재 `docker compose --env-file .env --profile full up -d --build` 운영 흐름을 유지하면서 Blue-Green 배포를 추가한다.
- 외부 진입은 `Cloudflare Tunnel -> Nginx -> active frontend -> same-color backend`로 고정한다.
- `postgres`, `redis`, `kafka`, `minio`는 공용으로 유지하고, `frontend`와 `backend`만 blue/green으로 분리한다.
- 이미지 태그 기반 배포와 SSH 기반 전환/롤백이 가능해야 한다.

## 2. 아키텍처

```text
Client
  -> Cloudflare Tunnel
  -> nginx
  -> frontend_blue or frontend_green
  -> backend_blue or backend_green
  -> shared postgres / redis / kafka / minio
```

핵심 원칙:

- Cloudflare Tunnel은 항상 Nginx 하나만 바라본다.
- Nginx는 `deploy/nginx/upstreams/active/frontend-active.conf` 기준으로 현재 active color를 결정한다.
- 각 frontend는 같은 color backend만 호출한다.
- 이전 color는 새 color 전환 뒤에도 남겨 두고, 롤백은 Nginx upstream 전환으로 처리한다.

## 3. 관련 파일

- `docker-compose.bluegreen.yml`
- `deploy/nginx/nginx.conf`
- `deploy/nginx/upstreams/frontend-blue.conf`
- `deploy/nginx/upstreams/frontend-green.conf`
- `deploy/nginx/upstreams/active/frontend-active.conf`
- `scripts/deploy-bluegreen.sh`
- `scripts/switch-traffic.sh`
- `scripts/rollback-bluegreen.sh`
- `.github/workflows/deploy-bluegreen.yml`

## 4. 필요한 환경 변수

기존 `.env`에 더해 아래 값을 운영 기준으로 명시한다.

| 변수 | 용도 | 기본값 |
| --- | --- | --- |
| `NGINX_PORT` | Nginx 외부 포트 | `4137` |
| `FRONTEND_IMAGE_REPOSITORY` | 프론트 이미지 저장소 | `perfo-frontend` |
| `BACKEND_IMAGE_REPOSITORY` | 백엔드 이미지 저장소 | `perfo-backend` |
| `FRONTEND_BLUE_IMAGE_TAG` | blue 프론트 이미지 태그 | `latest` |
| `FRONTEND_GREEN_IMAGE_TAG` | green 프론트 이미지 태그 | `latest` |
| `BACKEND_BLUE_IMAGE_TAG` | blue 백엔드 이미지 태그 | `latest` |
| `BACKEND_GREEN_IMAGE_TAG` | green 백엔드 이미지 태그 | `latest` |
| `FRONTEND_BLUE_HOST_PORT` | blue 프론트 호스트 포트 | `4138` |
| `FRONTEND_GREEN_HOST_PORT` | green 프론트 호스트 포트 | `4139` |
| `BACKEND_BLUE_HOST_PORT` | blue 백엔드 호스트 포트 | `8274` |
| `BACKEND_GREEN_HOST_PORT` | green 백엔드 호스트 포트 | `8275` |

권장:

- `FRONTEND_IMAGE_REPOSITORY=ghcr.io/<owner>/perfo-frontend`
- `BACKEND_IMAGE_REPOSITORY=ghcr.io/<owner>/perfo-backend`

## 5. Health Check 규칙

- 백엔드 앱 readiness: `GET /api/health`
- 프론트엔드 readiness: `GET /api/health`
- Nginx health: `GET /healthz`
- Spring Actuator `GET /actuator/health`는 운영 관측용으로 남기고, 배포 스위치 기준은 앱 health로 통일한다.

## 6. 배포 순서

1. GHCR에 새 `frontend:<sha>`, `backend:<sha>` 이미지를 push한다.
2. 서버에서 GHCR 로그인을 보장한다.
3. 현재 active color를 확인한다.
4. 반대 color의 `backend`를 새 이미지 태그로 먼저 기동한다.
5. `backend /api/health`가 200인지 확인한다.
6. 같은 color의 `frontend`를 새 이미지 태그로 기동한다.
7. `frontend /api/health`가 200인지 확인한다.
8. `switch-traffic.sh`로 Nginx active upstream을 새 color로 교체한다.
9. `nginx -s reload` 후 외부 스모크 테스트를 수행한다.

예시:

```bash
bash ./scripts/deploy-bluegreen.sh \
  --env-file .env \
  --frontend-tag 1a2b3c4d \
  --backend-tag 1a2b3c4d
```

특정 color 강제:

```bash
bash ./scripts/deploy-bluegreen.sh \
  --env-file .env \
  --target-color green \
  --frontend-tag 1a2b3c4d \
  --backend-tag 1a2b3c4d
```

## 7. 롤백 순서

1. 현재 active color를 확인한다.
2. 반대 color의 `backend`와 `frontend`가 살아 있고 health check가 통과하는지 본다.
3. `rollback-bluegreen.sh`를 실행한다.
4. Nginx upstream을 직전 color로 되돌린다.
5. 외부 스모크 테스트를 다시 수행한다.

예시:

```bash
bash ./scripts/rollback-bluegreen.sh --env-file .env
```

특정 color로 강제 롤백:

```bash
bash ./scripts/rollback-bluegreen.sh --env-file .env --target-color blue
```

## 8. DB Migration 규칙

- Blue와 Green이 동시에 살아 있을 수 있으므로 migration은 항상 하위 호환이어야 한다.
- 순서는 `expand -> app deploy -> switch -> contract`를 따른다.
- `ddl-auto=validate` 운영 원칙을 유지한다.
- destructive 변경은 새 앱이 완전히 안정화된 뒤 별도 작업으로 수행한다.

## 9. 운영 점검 체크리스트

- `docker compose -f docker-compose.yml -f docker-compose.bluegreen.yml --profile bluegreen ps`
- `curl -fsS http://127.0.0.1:<backend-port>/api/health`
- `curl -fsS http://127.0.0.1:<frontend-port>/api/health`
- `curl -fsS http://127.0.0.1:${NGINX_PORT:-4137}/healthz`
- 로그인, 티켓 조회, 구매 요청, 예약 QR, 검표 API 스모크 테스트
- GHCR pull 권한과 만료일 점검
- `deploy/nginx/upstreams/active/frontend-active.conf`가 의도한 color인지 확인

## 10. GitHub Actions 입력값

workflow 초안 `.github/workflows/deploy-bluegreen.yml`은 아래 입력을 사용한다.

- `frontend_tag`
- `backend_tag`
- `target_color`

필수 Secret:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PORT`
- `DEPLOY_SSH_KEY`
- `DEPLOY_APP_DIR`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
