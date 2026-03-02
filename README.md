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

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TailwindCSS v4, next-intl, NextAuth v4 |
| Backend | Spring Boot 3.4, Spring Security, Spring Data JPA, PostgreSQL |
| Infra | Docker Compose, PostgreSQL 16, Redis 7, Kafka (Confluent 7.5) |

## 시작하기

### 1. 인프라 실행 (필수)

```bash
docker compose up -d
```

PostgreSQL (`:15432`), Redis (`:16379`), Kafka (`:19092`) 가 실행됩니다.

### 2. Frontend 로컬 개발

```bash
cd frontend
pnpm install
pnpm dev
```

→ http://localhost:13000

### 3. Backend 로컬 개발

```bash
cd backend
./gradlew bootRun
```

→ http://localhost:18080

---

## Docker Compose

### 프로필 (Profiles)

| 명령어 | 실행 대상 | 용도 |
|--------|----------|------|
| `docker compose up -d` | Postgres, Redis, Kafka, Zookeeper | 로컬 개발 (인프라만) |
| `docker compose --profile dev up -d` | 인프라 + frontend-dev | Docker로 프론트 개발 |
| `docker compose --profile full up -d --build` | 인프라 + backend + frontend (prod) | 전체 프로덕션 배포 |

### 서비스 상세

| 서비스 | 이미지 / 빌드 | 포트 | 프로필 |
|--------|--------------|------|--------|
| `postgres` | postgres:16-alpine | `15432` → 5432 | (기본) |
| `redis` | redis:7-alpine | `16379` → 6379 | (기본) |
| `zookeeper` | cp-zookeeper:7.5.0 | `12181` → 2181 | (기본) |
| `kafka` | cp-kafka:7.5.0 | `19092` → 9092 | (기본) |
| `backend` | ./backend (Spring Boot) | `18080` | `full` |
| `frontend-dev` | ./frontend (dev target) | `13000` | `dev` |
| `frontend` | ./frontend (prod target) | `13000` | `full` |

### 주요 환경변수

**PostgreSQL:**
```
POSTGRES_USER=perfo
POSTGRES_PASSWORD=perfo123
POSTGRES_DB=perfo
```

**Backend (Spring Boot):**
```
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/perfo
SPRING_DATASOURCE_USERNAME=perfo
SPRING_DATASOURCE_PASSWORD=perfo123
```

### 데이터 볼륨

| 볼륨 | 용도 |
|------|------|
| `postgres_data` | PostgreSQL 데이터 영속화 |
| `redis_data` | Redis 데이터 영속화 |

### 자주 쓰는 명령어

```bash
# 전체 중지
docker compose down

# 전체 중지 + 볼륨 삭제 (데이터 초기화)
docker compose down -v

# 백엔드만 재빌드
docker compose --profile full up backend -d --build

# 로그 확인
docker compose logs -f backend
docker compose logs -f frontend

# 실행 중인 서비스 확인
docker compose ps
```

---

## 포트 정리

| 포트 | 서비스 |
|------|--------|
| `13000` | Frontend (Next.js) |
| `18080` | Backend (Spring Boot) |
| `15432` | PostgreSQL |
| `16379` | Redis |
| `19092` | Kafka |
| `12181` | Zookeeper |

> 모든 포트는 기본 포트와 충돌을 피하기 위해 커스텀 포트를 사용합니다.
