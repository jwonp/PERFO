# PERFO Developer Guide

프리미엄 티켓팅 솔루션

## 프로젝트 구조

```
PERFO/
├── frontend/          # Next.js 16 (React 19, TailwindCSS v4)
├── backend/           # Spring Boot 3.4 (JDK 17, Gradle)
├── docs/              # 문서
├── docker-compose.yml # 인프라 + 서비스 구성
└── README.md
```

## 기술 스택

| 영역     | 기술                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | Next.js 16, React 19, TailwindCSS v4, next-intl, NextAuth v4  |
| Backend  | Spring Boot 3.4, Spring Security, Spring Data JPA, PostgreSQL |
| Infra    | Docker Compose, PostgreSQL 16, Redis 7, Kafka (Confluent 7.5), MinIO |

## 시작하기

### 1. 인프라 준비 (필수)

```bash
docker compose --env-file .env.dev up -d
```

> PostgreSQL (`:15329`), Redis (`:16192`), Kafka (`:19043`), MinIO API (`:19000`), MinIO Console (`:19001`) 시스템이 백그라운드에서 실행됩니다. Docker Compose는 기본적으로 `.env`를 읽기 때문에, 개발 실행은 반드시 `--env-file .env.dev` 또는 아래 래퍼 스크립트를 사용해야 합니다.

### 2. Frontend 로컬 개발

```bash
cd frontend
pnpm install
pnpm dev
```

> http://localhost:14138 접근 가능

### 3. Backend 로컬 개발

Docker-compose `backend-dev` 프로필을 통한 Hot Reload 개발이 가능하며, 로컬에서 직접 구동할수도 있습니다.

```bash
cd backend
./gradlew bootRun
```

> http://localhost:18274 접근 가능

---

## Docker Compose

### 환경변수 파일

| 파일        | 용도                                                                          | Git 추적     |
| ----------- | ----------------------------------------------------------------------------- | ------------ |
| `.env.dev`  | 로컬 개발용 포트 및 DB/Redis/Kafka/MinIO 세팅 (5자리 단위 포트 포워딩) | ❌ gitignore |
| `.env`      | 운영/배포용 기본 환경 세팅 (4자리 단위 포트 포워딩)                  | ❌ gitignore |

중요:

- `docker compose`는 profile과 무관하게 기본적으로 `.env`를 읽습니다.
- 따라서 개발용 compose 실행은 항상 `docker compose --env-file .env.dev ...` 형태로 실행해야 합니다.
- 편의를 위해 아래 래퍼 스크립트를 제공합니다:
  - `./scripts/docker-compose-dev.sh`
  - `./scripts/docker-compose-full.sh`
- Docker 내부 backend는 Kafka에 `SPRING_KAFKA_BOOTSTRAP_SERVERS=kafka:9092`로 연결하고, 호스트 도구는 `${KAFKA_PORT}`로 연결합니다.
- projection 조회 proxy는 운영 점검용입니다. 기본 비활성이며 `TICKETING_PROJECTION_READ_API_ENABLED=true`와 `TICKETING_PROJECTION_ALLOWED_USER_IDS` allowlist가 모두 설정된 경우에만 동작합니다.
- 프로필/티켓 이미지는 MinIO에 저장합니다. 개발 호스트에서는 `${MINIO_API_PORT:-19000}`과 `${MINIO_CONSOLE_PORT:-19001}`로 접근합니다.

### 프로필 (Profiles)

| 명령어                                        | 실행 대상                           | 용도                              |
| --------------------------------------------- | ----------------------------------- | --------------------------------- |
| `docker compose --env-file .env.dev up -d`                        | 인프라 기본 (DB, Redis, Kafka, MinIO) | 로컬 개발용 인프라만 구성         |
| `docker compose --env-file .env.dev --profile dev up -d`          | 인프라 + backend-dev + frontend-dev | 소스코드 Hot Reload 개발 샌드박스 |
| `docker compose --env-file .env --profile full up -d --build` | 서비스 전체                         | 운영 서버 반영 용도               |

운영 Blue-Green 준비:

- `bash ./deploy.prod.sh`
- `docker compose --env-file .env -f docker-compose.yml -f docker-compose.bluegreen.yml --profile bluegreen up -d nginx backend_blue frontend_blue`
- 자세한 운영 절차는 `02_Development/00_Plan/21_BLUE_GREEN_DEPLOYMENT_PLAN.md`를 참고합니다.

### 서비스 상세

| 서비스         | 이미지 / 빌드                  | 포트 (Dev/Prod)    | 프로필 |
| -------------- | ------------------------------ | ------------------ | ------ |
| `postgres`     | postgres:16-alpine             | `15329` / `5329`   | (기본) |
| `redis`        | redis:7-alpine                 | `16192` / `6192`   | (기본) |
| `zookeeper`    | cp-zookeeper:7.5.0             | `12815` / `2815`   | (기본) |
| `kafka`        | cp-kafka:7.5.0                 | `19043` / `9043`   | (기본) |
| `minio`        | quay.io/minio/minio            | `19000` / `9000`   | (기본) |
| `minio-init`   | minio/mc                       | 내부 전용          | (기본) |
| `backend`      | ./backend (Spring Boot)        | `18274` / `8274`   | `full` |
| `backend-dev`  | ./backend (Hot Reload bootRun) | `18274` (Dev 고정) | `dev`  |
| `frontend`     | ./frontend (prod target)       | `14138` / `4138`   | `full` |
| `frontend-dev` | ./frontend (dev target)        | `14138` (Dev 고정) | `dev`  |

### 주요 환경변수

> 개발은 `.env.dev`, 운영/배포 기본값은 `.env` 파일을 참고합니다. 전체 변수 목록은 해당 파일에 정의되어 있습니다.

### 데이터 볼륨

| 볼륨            | 용도                     |
| --------------- | ------------------------ |
| `postgres_data` | PostgreSQL 데이터 영속화 |
| `redis_data`    | Redis 데이터 영속화      |
| `minio_data`    | MinIO object 데이터 영속화 |

### 자주 쓰는 명령어

```bash
# 전체 중지
docker compose --env-file .env.dev down

# 전체 중지 + 볼륨 삭제 (데이터 초기화)
docker compose --env-file .env.dev down -v

# 미사용 도커 리소스 정리 (이미지, 컨테이너, 네트워크 전체 삭제)
docker system prune -a --volumes

# 샌드박스 전용 개발 실행 (포어그라운드 로그 확인 가능)
docker compose --env-file .env.dev --profile dev up

# 또는 래퍼 스크립트 사용
./scripts/docker-compose-dev.sh up -d
./scripts/docker-compose-dev.sh up
```

---

## 포트 정리

| 포트 (Dev/Prod)  | 서비스                |
| ---------------- | --------------------- |
| `14138` / `4138` | Frontend (Next.js)    |
| `18274` / `8274` | Backend (Spring Boot) |
| `15329` / `5329` | PostgreSQL            |
| `16192` / `6192` | Redis                 |
| `19043` / `9043` | Kafka                 |
| `12815` / `2815` | Zookeeper             |
| `19000` / `9000` | MinIO API             |
| `19001` / `9001` | MinIO Console         |

> 로컬 충돌을 피하기 위해 생성된 랜덤 5자리(Dev), 4자리(Prod) 포트를 사용합니다.
