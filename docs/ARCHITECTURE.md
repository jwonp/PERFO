# PERFO 아키텍처 가이드

> 현재 코드 기준의 시스템 구조 요약이다. 장기 인프라 목표와 확장 전략은 `docs/01_Design/00_Architecture/01_ARCHITECTURE.md`에서 별도로 관리한다.

## 1. 프로젝트 개요

PERFO는 모바일 우선 티켓팅 플랫폼이다. 공개 이벤트 조회, 티켓 구매 요청, 예약 QR 발급, 현장 검표, 프로필/티켓 이미지 업로드, 푸시 알림을 제공한다.

## 2. 런타임 구성

```text
Browser / Mobile Web
  -> Next.js frontend
  -> Next.js API route proxy
  -> Spring Boot backend
  -> PostgreSQL / Redis / Kafka / MinIO
```

현재 저장소는 아래 두 앱으로 나뉜다.

- `frontend/`: Next.js 16, React 19, NextAuth v4, next-intl, Vitest, Playwright
- `backend/`: Spring Boot 3.4, Kotlin 2.0, Spring Security, JPA, Flyway, Kafka, MinIO SDK

인프라는 `docker-compose.yml` 기준으로 실행한다.

- `postgres`: 영속 데이터 저장소
- `redis`: 빠른 상태/캐시 저장소
- `zookeeper`, `kafka`: 티켓팅 이벤트/프로젝션 메시징
- `minio`, `minio-init`: 프로필/티켓 이미지 저장소와 버킷 초기화
- `backend`, `backend-dev`: Spring Boot API
- `frontend`, `frontend-dev`: Next.js 앱

## 3. 주요 포트

| 서비스 | Dev | Prod-like |
| ------ | --- | --------- |
| Frontend | `14138` | `4138` |
| Backend | `18274` | `8274` |
| PostgreSQL | `15329` | `5329` |
| Redis | `16192` | `6192` |
| Kafka | `19043` | `9043` |
| Zookeeper | `12815` | `2815` |
| MinIO API | `19000` | `9000` |
| MinIO Console | `19001` | `9001` |

## 4. 주요 경로

Frontend App Router:

- `frontend/app/[locale]/(main)/events`
- `frontend/app/[locale]/(main)/reserved`
- `frontend/app/[locale]/(main)/my-tickets`
- `frontend/app/[locale]/(main)/profile`
- `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan`

Frontend API routes:

- `/api/auth/[...nextauth]`
- `/api/events`
- `/api/tickets`
- `/api/ticketing/requests`
- `/api/reservations`
- `/api/notifications`
- `/api/push`
- `/api/health`

Backend API:

- `/api/auth/**`
- `/api/users/**`
- `/api/events/**`
- `/api/tickets/**`
- `/api/ticketing/**`
- `/api/reservations/**`
- `/api/health`

## 5. 티켓팅 흐름

```text
사용자 구매 요청
  -> frontend /api/ticketing/requests
  -> backend /api/ticketing/requests
  -> TicketingService
  -> PostgreSQL 트랜잭션으로 재고/티켓/요청 ledger/outbox 반영
  -> outbox relay와 projection consumer가 Kafka 기반 읽기 모델을 갱신
```

구매 요청은 `requestId`를 기준으로 멱등 처리한다. 판매 오픈 전, 판매 종료, 중복 구매, 사용자별 구매 제한, 재고 부족은 서비스 레이어에서 명시적인 결과 값으로 반환한다.

## 6. 이미지 저장

이미지 저장은 브라우저가 MinIO에 직접 접근하지 않고 backend를 경유한다.

- 프로필 이미지: `POST /api/users/me/profile-image`, `GET /api/users/me/profile-image`
- 티켓 이미지: `POST /api/tickets/{ticketId}/image`, `GET /api/tickets/{ticketId}/image`, `DELETE /api/tickets/{ticketId}/image`

관련 환경변수:

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_PROFILE_IMAGES`
- `MINIO_BUCKET_TICKET_IMAGES`
- `MINIO_PUBLIC_BASE_URL`

## 7. Health Check

배포 readiness 기준은 앱 health endpoint로 통일한다.

- Frontend: `GET /api/health` -> `{"status":"ok","service":"frontend"}`
- Backend: `GET /api/health` -> `{"status":"ok"}`
- Blue-Green Nginx: `GET /healthz` -> `ok`

Spring Actuator `/actuator/health`는 관측용으로 남긴다.

## 8. 로컬 실행

개발 인프라:

```bash
docker compose --env-file .env.dev up -d
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

Backend:

```bash
cd backend
./gradlew bootRun
```

Docker Hot Reload 샌드박스:

```bash
docker compose --env-file .env.dev --profile dev up
```

## 9. 테스트

Frontend:

```bash
cd frontend
pnpm test:unit
pnpm test:e2e
```

Backend:

```bash
cd backend
./gradlew test
```

테스트 세부 규칙은 `docs/test/README.md`와 `docs/01_Design/05_test/00_README.md`를 따른다.
