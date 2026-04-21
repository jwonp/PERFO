# PERFO

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
| Infra    | Docker Compose, PostgreSQL 16, Redis 7, Kafka (Confluent 7.5) |

## 시작하기

### 1. 인프라 준비 (필수)

```bash
docker compose up -d
```

> PostgreSQL (`:15329`), Redis (`:16192`), Kafka (`:19043`) 시스템이 백그라운드에서 실행됩니다. 개발 시 보통 .env에 심볼릭 링크 형태로 걸려있는 .env.dev 환경변수가 적용됩니다.

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
| `.env.dev`  | 로컬 개발용 포트 및 DB 세팅 (1\*\*\*\* 단위 포트 포워딩)                      | ✅ 추적됨    |
| `.env.prod` | 운영 환경 세팅 (4자리 단위 포워딩)                                            | ✅ 추적됨    |
| `.env`      | 컨테이너 자동 반영을 위해 심볼릭 링크 처리된 상태 (ex `ln -sf .env.dev .env`) | ❌ gitignore |

### 프로필 (Profiles)

| 명령어                                   | 실행 대상                           | 용도                              |
| ---------------------------------------- | ----------------------------------- | --------------------------------- |
| `docker compose up -d`                   | 인프라 기본 (DB, Redis, Kafka)      | 로컬 개발용 인프라만 구성         |
| `docker compose --profile dev up -d`     | 인프라 + backend-dev + frontend-dev | 소스코드 Hot Reload 개발 샌드박스 |
| `docker compose --env-file .env.prod --profile full up -d --build` | 서비스 전체                         | 운영 서버 반영 용도               |

### 서비스 상세

| 서비스         | 이미지 / 빌드                  | 포트 (Dev/Prod)    | 프로필 |
| -------------- | ------------------------------ | ------------------ | ------ |
| `postgres`     | postgres:16-alpine             | `15329` / `5329`   | (기본) |
| `redis`        | redis:7-alpine                 | `16192` / `6192`   | (기본) |
| `zookeeper`    | cp-zookeeper:7.5.0             | `12815` / `2815`   | (기본) |
| `kafka`        | cp-kafka:7.5.0                 | `19043` / `9043`   | (기본) |
| `backend`      | ./backend (Spring Boot)        | `18274` / `8274`   | `full` |
| `backend-dev`  | ./backend (Hot Reload bootRun) | `18274` (Dev 고정) | `dev`  |
| `frontend`     | ./frontend (prod target)       | `14138` / `4138`   | `full` |
| `frontend-dev` | ./frontend (dev target)        | `14138` (Dev 고정) | `dev`  |

### 주요 환경변수

> `.env.dev` / `.env.prod` 파일 참고. 전체 변수 목록은 해당 파일에 정의되어 있습니다.

### 데이터 볼륨

| 볼륨            | 용도                     |
| --------------- | ------------------------ |
| `postgres_data` | PostgreSQL 데이터 영속화 |
| `redis_data`    | Redis 데이터 영속화      |

### 자주 쓰는 명령어

```bash
# 전체 중지
docker compose down

# 전체 중지 + 볼륨 삭제 (데이터 초기화)
docker compose down -v

# 미사용 도커 리소스 정리 (이미지, 컨테이너, 네트워크 전체 삭제)
docker system prune -a --volumes

# 샌드박스 전용 개발 실행 (포어그라운드 로그 확인 가능)
docker compose --profile dev up
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

> 로컬 충돌을 피하기 위해 생성된 랜덤 5자리(Dev), 4자리(Prod) 포트를 사용합니다.
