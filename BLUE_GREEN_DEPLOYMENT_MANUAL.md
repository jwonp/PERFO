# PERFO Blue-Green Deployment Manual

## 목적

이 문서는 PERFO 운영 환경에서 `Docker Compose + Nginx + Cloudflare Tunnel` 기반 Blue-Green 배포를 실제로 수행할 때 바로 따라할 수 있는 실행 매뉴얼이다.

상세 설계 배경과 전체 운영 계획은 아래 문서를 참고한다.

- `docs/02_Development/00_Plan/21_BLUE_GREEN_DEPLOYMENT_PLAN.md`

## 배포 구조

```text
Client
  -> Cloudflare Tunnel
  -> Nginx
  -> active frontend (blue or green)
  -> same-color backend
  -> shared postgres / redis / kafka / minio
```

핵심 원칙:

- `frontend`와 `backend`만 blue/green으로 나눈다.
- `postgres`, `redis`, `kafka`, `minio`는 공용으로 유지한다.
- 트래픽 전환은 컨테이너 재기동이 아니라 `Nginx upstream 전환 + reload`로 처리한다.
- 배포 readiness 기준은 프론트/백엔드 모두 `GET /api/health`다.

## 관련 파일

- `docker-compose.yml`
- `docker-compose.bluegreen.yml`
- `deploy/nginx/nginx.conf`
- `deploy/nginx/upstreams/active/frontend-active.conf`
- `deploy.prod.sh`
- `scripts/deploy-bluegreen.sh`
- `scripts/switch-traffic.sh`
- `scripts/rollback-bluegreen.sh`

## 사전 준비

### 1. 서버 `.env` 확인

운영 서버 `.env`에는 기존 변수 외에 아래 항목이 있어야 한다.

```env
NGINX_PORT=4137

FRONTEND_IMAGE_REPOSITORY=ghcr.io/<owner>/perfo-frontend
BACKEND_IMAGE_REPOSITORY=ghcr.io/<owner>/perfo-backend

FRONTEND_BLUE_HOST_PORT=4138
FRONTEND_GREEN_HOST_PORT=4139
BACKEND_BLUE_HOST_PORT=8274
BACKEND_GREEN_HOST_PORT=8275

# docker-compose.bluegreen.yml이 앱 컨테이너에 전달하는 MinIO bucket 값
MINIO_BUCKET_PROFILE_IMAGES=profile-images
MINIO_BUCKET_TICKET_IMAGES=ticket-images
```

선택적으로 초기값을 넣을 수 있다.

```env
FRONTEND_BLUE_IMAGE_TAG=latest
FRONTEND_GREEN_IMAGE_TAG=latest
BACKEND_BLUE_IMAGE_TAG=latest
BACKEND_GREEN_IMAGE_TAG=latest
```

### 2. 현재 active color 확인

현재 nginx가 어느 color를 바라보는지 확인한다.

```bash
cat deploy/nginx/upstreams/active/frontend-active.conf
```

`frontend_blue:3000`이면 blue가 active, `frontend_green:3000`이면 green이 active다.

### 3. compose 설정 정합성 확인

운영 서버에서 compose 머지 결과를 먼저 확인한다.

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  config
```

## 초기 기동

Blue-Green 구조를 처음 올릴 때는 보통 현재 서비스와 맞는 color 하나부터 기동한다.

예시:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  up -d nginx backend_blue frontend_blue
```

상태 확인:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  ps
```

헬스체크:

```bash
curl -fsS http://127.0.0.1:8274/api/health
curl -fsS http://127.0.0.1:4138/api/health
curl -fsS http://127.0.0.1:4137/healthz
```

현재 앱 헬스 응답은 최소 응답만 제공한다.

- backend: `{"status":"ok"}`
- frontend: `{"status":"ok","service":"frontend"}`

## 일반 배포 절차

새 이미지 태그가 있다고 가정한다.

- frontend tag: `abc1234`
- backend tag: `abc1234`

운영 기본 진입점:

```bash
bash ./deploy.prod.sh
```

기본값:

- `.env` 사용
- frontend/backend 모두 `prod` 태그 사용
- 현재 active의 반대 color로 자동 배포

자동으로 반대 color에 특정 태그 배포:

```bash
bash ./deploy.prod.sh --tag abc1234
```

기존 저수준 스크립트를 직접 써도 된다:

```bash
bash ./scripts/deploy-bluegreen.sh \
  --env-file .env \
  --frontend-tag abc1234 \
  --backend-tag abc1234
```

특정 color 강제 배포:

```bash
bash ./deploy.prod.sh --tag abc1234 --target-color green
```

또는:

```bash
bash ./scripts/deploy-bluegreen.sh \
  --env-file .env \
  --target-color green \
  --frontend-tag abc1234 \
  --backend-tag abc1234
```

스크립트가 하는 일:

1. 현재 active color 확인
2. 반대 color backend 기동
3. backend `/api/health` 확인
4. 같은 color frontend 기동
5. frontend `/api/health` 확인
6. nginx upstream 전환
7. nginx reload

## 수동 트래픽 전환

이미 두 color가 다 살아 있고, 트래픽만 바꾸고 싶을 때 사용한다.

```bash
bash ./scripts/switch-traffic.sh green --env-file .env
```

전환 후 확인:

```bash
cat deploy/nginx/upstreams/active/frontend-active.conf
curl -fsS http://127.0.0.1:4137/healthz
```

## 롤백 절차

직전 color로 즉시 롤백:

```bash
bash ./scripts/rollback-bluegreen.sh --env-file .env
```

특정 color로 강제 롤백:

```bash
bash ./scripts/rollback-bluegreen.sh --env-file .env --target-color blue
```

스크립트가 하는 일:

1. 롤백 대상 color의 backend health 확인
2. 롤백 대상 color의 frontend health 확인
3. nginx upstream 복구
4. nginx reload

## 운영 점검 체크리스트

배포 전:

- GHCR 로그인 상태 확인
- `.env` 값 확인
- 현재 active color 확인
- DB migration이 하위 호환인지 확인

배포 직후:

- `GET /api/health` 확인
- `GET /healthz` 확인
- 로그인 동작 확인
- 티켓 조회 확인
- 구매 요청 확인
- 예약 QR 확인
- 검표 API 확인

## DB migration 규칙

Blue-Green에서는 두 버전이 잠깐 동시에 떠 있을 수 있다.

반드시 아래 규칙을 지킨다.

1. `expand` migration 먼저 적용
2. 새 앱 배포
3. 트래픽 전환
4. 안정화 확인
5. 필요 시 `contract` migration 별도 수행

금지:

- 즉시 컬럼 삭제
- 즉시 제약 강화
- 구버전 앱이 읽지 못하는 파괴적 변경

## 장애 시 우선순위

1. 트래픽을 이전 color로 되돌린다.
2. `/api/health`, `/healthz`부터 확인한다.
3. nginx active upstream 파일이 의도한 color인지 본다.
4. 새 color 컨테이너 로그를 확인한다.
5. DB migration이 하위 호환 규칙을 어겼는지 확인한다.

## 자주 쓰는 명령어

전체 상태:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  ps
```

로그 확인:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  logs -f nginx frontend_blue frontend_green backend_blue backend_green
```

Nginx 설정 반영:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.bluegreen.yml \
  --profile bluegreen \
  exec -T nginx nginx -s reload
```
