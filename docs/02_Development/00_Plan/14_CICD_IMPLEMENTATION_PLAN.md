# PERFO CI/CD 구축 실행 계획

> 기준 문서:
> `docs/02_Development/00_Plan/03_INFRA_PLAN.md`
> `docs/02_Development/00_Plan/08_UBUNTU_SERVER_CICD_AUTOSCALING_PLAN.md`
> `docs/02_Development/00_Plan/09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md`
>
> 현재 서버 접속 전제:
> `DEPLOY_USER@DEPLOY_HOST`
> 서버 내 프로젝트 경로:
> `DEPLOY_APP_DIR`

## 1. 문서 목적

- 현재 Ubuntu 서버에 맞는 CI/CD 구축 방식을 먼저 문서화한다.
- 운영 서버를 빌드 서버가 아닌 배포 대상 서버로만 사용한다.
- GitHub Actions에서 테스트, 빌드, 이미지 push를 수행하고, 서버에는 SSH로 접속해 배포만 실행한다.
- 초기에는 `Docker Compose + GHCR + SSH 배포`로 시작하고, 이후 블루/그린 또는 K3s 전환이 가능하게 둔다.

## 2. 현재 결론

1단계 CI/CD는 아래 구조로 구축한다.

```text
GitHub Actions
  -> frontend lint/test/build
  -> backend test
  -> Docker image build
  -> GHCR push
  -> SSH DEPLOY_USER@DEPLOY_HOST
  -> DEPLOY_APP_DIR
  -> docker compose pull
  -> docker compose up -d
  -> health check
```

이 방식은 기존 문서의 `Cloudflare Tunnel + Nginx + Docker Compose + GHCR + GitHub Actions SSH 배포` 권장안과 일치한다.

## 3. 운영 원칙

- `main` 또는 운영 배포 브랜치에 들어간 코드만 배포 대상으로 삼는다.
- PR에서는 테스트와 빌드 검증까지만 수행한다.
- 실제 운영 배포는 `workflow_dispatch` 또는 운영 브랜치 merge로 제한한다.
- 서버의 `.env`는 Git에 커밋하지 않는다.
- GitHub Actions용 SSH 키와 사람이 접속하는 SSH 키는 분리하는 것을 목표로 한다.
- 배포 계정은 `DEPLOY_APP_DIR`과 Docker 실행에 필요한 권한만 갖게 한다.
- 운영 서버에서 `git pull`로 코드를 직접 신뢰하기보다, CI가 만든 이미지 태그를 배포하는 구조를 우선한다.

## 4. GitHub Secrets

GitHub Actions에는 아래 Secret을 둔다.

| Secret | 값 | 구하는 방법 |
|--------|----|-------------|
| `DEPLOY_HOST` | 운영 서버 IP 또는 도메인 | 서버 접속 주소에서 확인한다. 실제 값은 GitHub Secret에만 둔다. |
| `DEPLOY_USER` | 운영 서버 배포 계정 | 서버에 만든 배포 전용 계정 이름이다. 실제 값은 GitHub Secret에만 둔다. |
| `DEPLOY_PORT` | SSH 포트 | 기본값은 `22`다. SSH 포트를 변경했다면 변경된 포트를 넣는다. |
| `DEPLOY_SSH_KEY` | GitHub Actions 전용 private key 본문 | 아래 `4.1 DEPLOY_SSH_KEY 발급` 절차로 새 키를 만들고 private key 본문을 넣는다. |
| `DEPLOY_APP_DIR` | 서버 내 PERFO 경로 | 서버에서 PERFO 저장소가 위치한 절대 경로다. 실제 값은 GitHub Secret에만 둔다. |
| `GHCR_USERNAME` | GHCR 로그인 계정 | GitHub 사용자명 또는 organization/package owner 이름을 넣는다. |
| `GHCR_TOKEN` | GHCR push/pull token | 아래 `4.2 GHCR_TOKEN 발급` 절차로 만든다. |

주의:

- 로컬 접속에 사용하는 private key 본문은 저장소에 기록하지 않는다.
- 로컬 key 파일 경로는 개인 환경 값이므로 GitHub Secret에는 넣지 않는다.
- `DEPLOY_SSH_KEY`는 가능하면 새로 발급한 배포 전용 키를 사용한다.
- 서버의 배포 계정 `~/.ssh/authorized_keys`에는 배포 전용 public key만 추가한다.
- GHCR token은 최소 권한으로 발급하고, push와 pull 권한을 분리할 수 있으면 분리한다.

실제 서버 IP, 계정, 경로, token 발급 메모처럼 공개 저장소에 올라가면 곤란한 값은 GitHub Secret, 서버 `.env`, 또는 `.gitignore`에 포함된 로컬 인프라 문서에만 둔다.

### 4.1 DEPLOY_SSH_KEY 발급

GitHub Actions가 서버에 접속할 때 사용할 전용 SSH key pair를 로컬에서 새로 만든다.

```text
ssh-keygen -t ed25519 -C "github-actions-perfo-deploy" -f ~/.ssh/perfo_github_actions_deploy
```

생성되는 파일:

```text
~/.ssh/perfo_github_actions_deploy
~/.ssh/perfo_github_actions_deploy.pub
```

서버에는 public key만 등록한다.

```text
ssh-copy-id -i ~/.ssh/perfo_github_actions_deploy.pub DEPLOY_USER@DEPLOY_HOST
```

`ssh-copy-id`를 사용할 수 없으면 public key 내용을 서버의 배포 계정 `~/.ssh/authorized_keys`에 한 줄로 추가한다.

GitHub Secret `DEPLOY_SSH_KEY`에는 private key 파일 본문 전체를 넣는다.

```text
cat ~/.ssh/perfo_github_actions_deploy
```

검증:

```text
ssh -i ~/.ssh/perfo_github_actions_deploy DEPLOY_USER@DEPLOY_HOST "cd DEPLOY_APP_DIR && pwd"
```

기존 사람이 쓰는 SSH key와 Actions 배포 key를 분리해야 키 회전과 권한 축소가 쉽다.

### 4.2 GHCR_USERNAME, GHCR_TOKEN 발급

권장 흐름:

1. GitHub Actions에서 같은 저장소의 GHCR package를 push할 때는 가능하면 `GITHUB_TOKEN`을 사용한다.
2. 서버가 GHCR에서 private image를 pull해야 하므로, 서버 pull용 `GHCR_USERNAME`과 `GHCR_TOKEN`은 별도로 둔다.
3. `GHCR_USERNAME`은 GitHub 사용자명 또는 package owner 이름이다.
4. `GHCR_TOKEN`은 GitHub personal access token classic으로 만든다.

GitHub UI 기준:

1. GitHub 우측 상단 프로필
2. `Settings`
3. `Developer settings`
4. `Personal access tokens`
5. `Tokens (classic)`
6. `Generate new token (classic)`
7. 만료일 설정
8. scope 선택
9. `Generate token`

서버 pull 전용 token scope:

```text
read:packages
```

CI가 PAT로 GHCR push까지 해야 하는 경우의 token scope:

```text
write:packages
```

주의:

- GitHub 공식 문서는 GHCR 인증에 personal access token classic을 요구한다고 안내한다.
- 같은 저장소의 GitHub Actions에서 이미지를 publish할 때는 `GITHUB_TOKEN` 사용을 우선 검토한다.
- `write:packages`는 `read:packages`를 포함한다.
- `repo` scope는 가능한 한 피하고, private package 접근 때문에 꼭 필요할 때만 추가한다.

서버에서 GHCR pull 인증:

```text
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

GitHub Secret 등록 위치:

```text
Repository Settings
  -> Secrets and variables
  -> Actions
  -> Secrets
  -> New repository secret
```

CLI로 등록할 수도 있다.

```text
gh secret set DEPLOY_SSH_KEY < ~/.ssh/perfo_github_actions_deploy
gh secret set GHCR_USERNAME
gh secret set GHCR_TOKEN
```

## 5. 서버 사전 준비

서버에는 아래 조건을 맞춘다.

```text
DEPLOY_APP_DIR
  docker-compose.yml
  docker-compose.bluegreen.yml
  deploy/nginx/
  .env
  scripts/
    deploy-bluegreen.sh
    switch-traffic.sh
    rollback-bluegreen.sh
    backup-db.sh
  releases/
    current.env
    previous.env
```

필수 준비:

- Docker와 Docker Compose plugin 설치
- 배포 계정의 Docker 실행 권한 확인
- GHCR pull 인증 확인
- `.env` 작성 및 파일 권한 제한
- `cloudflared`와 Nginx는 systemd 서비스로 운영
- 외부 공개는 Cloudflare Tunnel을 우선 사용
- PostgreSQL, Redis, MinIO, Kafka 포트는 외부에 직접 공개하지 않음

`.env`는 아래 계열 값을 포함한다.

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_PORT
REDIS_PORT
KAFKA_PORT
ZOOKEEPER_PORT
BACKEND_PORT
FRONTEND_PORT
SPRING_PROFILES_ACTIVE
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET
CORS_ALLOWED_ORIGINS
NEXTAUTH_URL
NEXTAUTH_SECRET
BACKEND_URL
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NAVER_CLIENT_ID
NAVER_CLIENT_SECRET
LINE_CLIENT_ID
LINE_CLIENT_SECRET
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
KAFKA_BROKERS
REDIS_URL
MINIO_ROOT_USER
MINIO_ROOT_PASSWORD
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_REGION
MINIO_BUCKET_PROFILE_IMAGES
MINIO_BUCKET_TICKET_IMAGES
MINIO_PUBLIC_BASE_URL
MINIO_BROWSER_REDIRECT_URL
MINIO_SERVER_URL
```

## 6. CI 워크플로우

### 6.1 PR 검증

PR에서는 운영 배포 없이 검증만 수행한다.

1. frontend 의존성 설치
2. `pnpm lint`
3. `pnpm test:unit`
4. `pnpm build`
5. backend `./gradlew test`
6. Docker 이미지 build

현재 저장소 기준 명령:

```text
cd frontend && pnpm install --frozen-lockfile
cd frontend && pnpm lint
cd frontend && pnpm test:unit
cd frontend && pnpm build
cd backend && ./gradlew test
docker build -t perfo-frontend:ci ./frontend
docker build -t perfo-backend:ci ./backend
```

### 6.2 운영 이미지 빌드

운영 배포 대상 commit에서는 이미지를 GHCR에 push한다.

권장 이미지:

```text
ghcr.io/<owner>/perfo-frontend:<git-sha>
ghcr.io/<owner>/perfo-backend:<git-sha>
ghcr.io/<owner>/perfo-frontend:prod
ghcr.io/<owner>/perfo-backend:prod
```

원칙:

- `git-sha` 태그는 불변 배포 단위다.
- `prod` 태그는 현재 운영 포인터로만 사용한다.
- 롤백은 `prod` 재사용보다 직전 `git-sha` 태그로 수행한다.

## 7. Compose 운영 방식

현재 기본 `docker-compose.yml`의 `backend`, `frontend` 서비스는 `build` 기준이고, Blue-Green 운영은 `docker-compose.bluegreen.yml`에서 GHCR `image` 기준으로 `backend_blue`, `backend_green`, `frontend_blue`, `frontend_green`을 기동한다.

CI/CD를 붙일 때 운영 서버에서 빌드하지 않으려면 Blue-Green 구성을 기준으로 배포한다.

### 7.1 권장: Blue-Green image 태그 배포

`docker-compose.bluegreen.yml`은 아래 이미지 변수를 사용한다.

```yaml
services:
  backend_blue:
    image: ${BACKEND_IMAGE_REPOSITORY}:${BACKEND_BLUE_IMAGE_TAG}

  frontend_blue:
    image: ${FRONTEND_IMAGE_REPOSITORY}:${FRONTEND_BLUE_IMAGE_TAG}
```

배포 명령:

```text
bash ./scripts/deploy-bluegreen.sh --env-file .env --frontend-tag <git-sha> --backend-tag <git-sha>
```

### 7.2 대안: 서버에서 직접 빌드

서버가 빌드까지 수행하는 방식은 초기 임시 운영에만 사용한다.

```text
git pull
docker compose --env-file .env --profile full up -d --build
```

이 방식은 단순하지만 배포 시간이 길고, 서버 리소스를 빌드에 사용하므로 장기 운영 방식으로 두지 않는다.

## 8. CD 워크플로우

배포 워크플로우는 아래 순서를 따른다.

1. 배포할 frontend/backend image tag를 commit SHA로 확정한다.
2. GitHub Actions가 SSH로 서버에 접속한다.
3. 서버에서 GHCR login 상태를 확인한다.
4. 배포 전 DB 백업을 수행한다.
5. 현재 active color를 확인한다.
6. inactive color에 새 backend/frontend tag를 배포한다.
7. inactive color의 backend와 frontend `/api/health`를 확인한다.
8. Nginx upstream을 새 color로 전환하고 reload한다.
9. Nginx `/healthz`와 사용자 핵심 흐름을 확인한다.
10. 실패하면 `rollback-bluegreen.sh`로 직전 color를 복구한다.

GitHub Actions SSH 실행은 서버에 긴 명령을 직접 박아 넣지 않고, 서버의 `scripts/deploy-bluegreen.sh`를 호출하는 형태로 둔다.

```text
ssh DEPLOY_USER@DEPLOY_HOST "cd DEPLOY_APP_DIR && bash scripts/deploy-bluegreen.sh --env-file .env --frontend-tag <git-sha> --backend-tag <git-sha>"
```

## 9. 배포 스크립트 계약

`scripts/deploy-bluegreen.sh`는 다음 입력을 받는다.

```text
--frontend-tag <git-sha>
--backend-tag <git-sha>
--target-color blue|green  # 선택
--env-file .env            # 선택
```

수행해야 할 일:

- frontend/backend tag가 비어 있으면 즉시 실패
- `DEPLOY_APP_DIR`에서 실행되는지 확인
- `backup-db.sh` 실행
- 현재 active color와 target color 확인
- target color의 GHCR 이미지 pull
- target color backend/frontend 기동
- backend/frontend `/api/health` 확인
- `switch-traffic.sh`로 Nginx upstream 전환
- 실패 시 `rollback-bluegreen.sh` 실행

현재 코드 기준 health check는 최소 아래를 확인한다.

```text
curl -fsS http://localhost:<BACKEND_PORT>/api/health
curl -fsS http://localhost:<FRONTEND_PORT>/api/health
```

현재 backend와 frontend 모두 `/api/health`를 제공한다. Spring Actuator `/actuator/health`는 관측용으로 남기고, 배포 성공 판단은 앱 health인 `/api/health`로 통일한다.

## 10. 롤백 기준

롤백은 아래 상황에서 즉시 수행한다.

- 새 컨테이너가 시작되지 않음
- backend health check 실패
- frontend HTTP 응답 실패
- Nginx upstream 전환 후 5xx 비율 급증
- DB migration 실패

초기 롤백은 앱 컨테이너 태그만 되돌린다.

주의:

- DB schema migration이 포함된 배포는 반드시 backward-compatible 해야 한다.
- destructive migration은 앱 롤백만으로 복구되지 않으므로 별도 승인 절차를 둔다.
- 운영 DB 백업 없이 schema 변경 배포를 진행하지 않는다.

## 11. 배포 브랜치 정책

권장:

- `develop`: 통합 개발 브랜치
- `main`: 운영 배포 브랜치
- feature/fix branch: 개별 작업 브랜치

동작:

- PR to `develop`: lint/test/build만 수행
- PR to `main`: lint/test/build + Docker image build 검증
- merge to `main`: image push + 배포 가능
- `workflow_dispatch`: 특정 SHA 또는 태그 수동 배포

현재 프로젝트 지침상 feature 작업은 `develop`에 직접 commit하지 않는다.

## 12. 보안 체크리스트

- SSH password login 비활성화
- 배포 계정은 sudo 범위 최소화
- 배포 계정의 `authorized_keys`는 배포용 키만 유지
- `.env` 권한은 `600` 수준으로 제한
- GHCR token은 최소 권한으로 발급
- DB, Redis, MinIO, Kafka 포트는 내부 네트워크에서만 접근
- Nginx 뒤에 frontend/backend를 둔다
- Cloudflare Tunnel token은 서버 비밀로만 관리
- 배포 로그에 Secret 값이 출력되지 않게 한다
- GitHub Actions log에 `.env` 내용을 출력하지 않는다

## 13. 1차 구현 순서

1. 서버에서 `DEPLOY_APP_DIR`의 현재 실행 방식을 확인한다.
2. `docker-compose.bluegreen.yml`의 GHCR image 기반 운영 구성을 확인한다.
3. `scripts/deploy-bluegreen.sh`, `scripts/switch-traffic.sh`, `scripts/rollback-bluegreen.sh`를 확인한다.
4. GitHub Secrets를 등록한다.
5. `.github/workflows/ci.yml`을 추가한다.
6. `.github/workflows/deploy.yml`을 추가한다.
7. PR에서 lint/test/build가 통과하는지 확인한다.
8. GHCR에 frontend/backend 이미지가 push되는지 확인한다.
9. 수동 배포로 서버에서 새 이미지가 실행되는지 확인한다.
10. 실패 케이스를 일부러 만들어 rollback이 동작하는지 확인한다.

## 14. 이후 개선

- Nginx upstream 기반 블루/그린 배포
- frontend/backend healthcheck를 Compose에 명시
- PostgreSQL backup retention 정책 자동화
- Uptime Kuma 또는 외부 uptime check 연결
- Prometheus, cAdvisor, node-exporter, Grafana 구성
- Trivy 같은 이미지 취약점 스캔 추가
- K3s 전환 시 Argo CD 기반 GitOps로 CD 계층 교체

## 15. 참고 문서

- GitHub Actions repository secrets: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- GitHub Container Registry 인증과 GHCR push/pull: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub personal access token 관리: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
