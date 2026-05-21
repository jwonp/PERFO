# PERFO 아키텍처

> 2026-05-20 기준 현재 코드베이스를 바탕으로 정리한 실행 아키텍처 문서다. 장기 목표나 확장안이 아니라, 지금 저장소가 실제로 어떻게 동작하는지에 초점을 둔다.
>
> 설계 방향이나 목표 상태는 `docs/01_Design/00_Architecture/*` 문서에 남기고, 이 문서는 "현재 런타임 사실"만 기록한다. 즉 목표는 목표대로 두고, 여기서는 현재 구현만 적는다.

## 1. 한눈에 보기

PERFO는 아래 2개 주 애플리케이션과 4개 인프라 저장소/브로커로 구성된다.

- `frontend/`: Next.js 16 기반 웹 앱이자 BFF(Backend for Frontend)
- `backend/`: Spring Boot 3.4 + Kotlin 기반 도메인 API 서버
- `PostgreSQL`: 핵심 도메인 데이터 저장
- `Redis`: 보조 캐시/실험성 재고 처리 모듈용 저장소
- `Kafka`: 티켓팅 비동기 후처리 메시징
- `MinIO`: 프로필/티켓 이미지 오브젝트 저장소

보조 런타임 흔적도 있다.

- `frontend/main-process/*`: Electron 데스크톱 셸 코드

다만 현재 기본 배포/개발 동선은 Electron이 아니라 웹 + API 조합이다.

핵심 특징은 다음 3가지다.

- 브라우저는 백엔드를 직접 치지 않고 대부분 `frontend/app/api/**`를 통해 진입한다.
- `frontend`는 UI만 담당하지 않고 인증 세션, 내부 프록시 JWT 발급, 알림/푸시 저장까지 맡는다.
- `backend`는 실제 도메인 규칙과 트랜잭션을 소유하고, 티켓팅 결과는 outbox + Kafka + projection으로 비동기 후처리한다.

## 2. 런타임 구성

```text
Browser / Mobile Web
  -> Next.js App Router pages
  -> Next.js Route Handlers (/api/*)
     - NextAuth session 확인
     - 내부 JWT 생성
     - 일부 알림/푸시/Prisma 처리
  -> Spring Boot Backend (/api/*)
     - 인증/인가
     - 도메인 서비스
     - JPA/Flyway/Kafka/MinIO
  -> PostgreSQL / Kafka / Redis / MinIO

(Optional)
Electron Shell
  -> embedded Next.js frontend
```

배포 및 로컬 런타임은 `docker-compose.yml`을 기준으로 한다.

- `frontend`, `frontend-dev`
- `backend`, `backend-dev`
- `postgres`
- `redis`
- `zookeeper`
- `kafka`
- `minio`
- `minio-init`

## 3. 계층별 책임

## 3.1 Frontend: UI + BFF

`frontend`는 단순 SPA가 아니라 서버 사이드 BFF 역할을 한다.

주요 책임:

- App Router 페이지 렌더링
- `next-intl` 기반 다국어 라우팅
- `NextAuth` 기반 로그인 세션 관리
- 브라우저 요청을 백엔드로 전달하는 내부 API 프록시
- 내부 API JWT 생성 후 백엔드 scope 기반 인증 헤더 부착
- 알림 목록/읽음 처리/푸시 구독 관리
- Prisma 또는 로컬 JSON fallback을 통한 알림 저장
- 선택적 Electron 셸 진입점 제공

핵심 진입점:

- 페이지: `frontend/app/[locale]/(main)/*`, `frontend/app/[locale]/(auth)/*`
- BFF 라우트: `frontend/app/api/events`, `tickets`, `reservations`, `ticketing/requests`
- 인증: `frontend/app/api/auth/[...nextauth]/route.ts`
- 알림: `frontend/app/api/notifications/*`
- 푸시: `frontend/app/api/push/*`
- 데스크톱 셸: `frontend/main-process/*`

프록시 구조의 핵심은 `frontend/lib/server/internal-proxy-auth.ts`와 `frontend/lib/server/internal-api-jwt.ts`다.
이 계층이 세션 사용자를 내부 JWT로 변환하고, 백엔드는 이 토큰의 scope를 검사해 요청을 신뢰한다.

## 3.2 Backend: 도메인 시스템 오브 레코드

`backend`는 실제 비즈니스 규칙과 데이터 변경을 담당한다.

주요 책임:

- 인증, 회원가입, OAuth 연동, 이메일 검증
- 이벤트 조회
- 티켓 생성/수정/조회
- 예약 조회 및 QR 토큰 발급
- QR 검표와 상태 전이
- 티켓팅 구매 요청 처리
- 이미지 업로드/조회
- Kafka 기반 비동기 projection 갱신

주요 계층 구조:

- Controller: `backend/src/main/kotlin/com/perfo/backend/controller`
- Service: `backend/src/main/kotlin/com/perfo/backend/service`
- Repository: `backend/src/main/kotlin/com/perfo/backend/repository`
- Entity: `backend/src/main/kotlin/com/perfo/backend/entity`
- Config/Security: `backend/src/main/kotlin/com/perfo/backend/config`

## 3.3 인프라 계층

- PostgreSQL
  - 백엔드 JPA 엔티티의 기본 저장소
  - Flyway migration 사용
  - 티켓팅 ledger/outbox/projection 테이블도 여기에 존재
- Kafka
  - 티켓팅 결과 outbox relay 이후 메시지 전달
  - projection consumer가 읽기 모델 적재에 사용
- Redis
  - 현재 compose와 의존성에는 포함되어 있음
  - 하지만 핵심 사용자 요청 흐름에 실질적으로 연결된 코드는 거의 없음
  - 확인 가능한 직접 사용처는 `frontend/lib/redis/inventory.ts` 수준의 보조/실험성 재고 처리 코드다
- MinIO
  - 프로필 이미지, 티켓 이미지 저장
  - 브라우저가 직접 접근하지 않고 backend 경유

## 4. 인증 및 권한 구조

인증은 2단계로 나뉜다.

### 4.1 사용자 인증

- 브라우저 로그인은 `NextAuth`가 담당
- OAuth 공급자: Google, Naver, Line
- 이메일/비밀번호 로그인도 NextAuth credentials provider를 통해 backend `/api/auth/login`으로 위임

즉 사용자 세션의 기준점은 frontend다.

### 4.2 서비스 간 내부 인증

frontend가 backend를 호출할 때는 세션 쿠키를 그대로 넘기지 않는다.
대신 scope가 포함된 내부 JWT를 발급해서 Authorization Bearer 헤더로 전달한다.

대표 scope:

- `tickets`
- `ticketing`
- `ticketing:projection`
- `users`
- `auth:oauth`

backend에서는 `HeaderAuthenticationFilter`가 경로별 필요 scope를 결정하고, `InternalApiJwtService`가 토큰을 검증한다.

이 구조 덕분에:

- backend는 frontend를 신뢰 가능한 내부 호출자로 취급할 수 있고
- 브라우저는 backend 비밀키나 내부 인증 로직을 알 필요가 없고
- 경로별 최소 권한 부여가 가능하다

## 5. 도메인별 구조

## 5.1 인증/회원

Frontend:

- `app/api/auth/[...nextauth]`
- 로그인/회원가입/비밀번호 재설정 페이지

Backend:

- `AuthController`
- `AuthService`
- `UserController`
- `UserService`

흐름:

1. 사용자는 frontend에서 로그인/회원가입을 시작한다.
2. frontend는 NextAuth 또는 자체 route handler를 통해 backend 인증 API를 호출한다.
3. backend는 사용자 계정 생성, 검증 코드 처리, OAuth 사용자 동기화를 담당한다.
4. frontend는 backend 사용자 ID를 세션 토큰에 저장해 이후 BFF 요청에 사용한다.

## 5.2 이벤트/티켓/예약

이 영역은 일반 CRUD + 조회 중심이다.

주요 backend API:

- `/api/events`
- `/api/tickets`
- `/api/reservations`
- `/api/reservations/{reservationId}/qr-token`
- `/api/tickets/{ticketId}/validations`

주요 frontend 페이지:

- `events`
- `my-tickets`
- `reserved`
- `profile`
- `my-tickets/[ticketId]/scan`

브라우저 요청은 frontend API route를 거쳐 backend로 전달된다.
따라서 UI와 backend DTO 사이에 BFF 계층이 하나 더 있는 구조다.

## 5.3 알림/푸시

알림 도메인은 현재 backend가 아니라 frontend 서버 런타임에 더 가깝다.

저장 위치:

- 1순위: Prisma + PostgreSQL
- fallback: `frontend/.data/notification-store.json`

주요 구성:

- `frontend/lib/notifications/notification-service.ts`
- `frontend/app/api/notifications/*`
- `frontend/app/api/push/*`
- `frontend/app/api/internal/notifications/ticket-transition/route.ts`

현재 의미:

- 알림 생성, snapshot 갱신, push subscription 저장은 frontend 서버 계층이 담당
- 내부 전이 이벤트 수신은 `x-internal-notification-secret` 기반 보호 엔드포인트로 처리
- 아직 backend의 모든 상태 전이가 자동으로 이 경로와 강하게 결합된 구조는 아니다

즉 알림은 "frontend 내 서버 기능"으로 독립된 서브시스템이 얹혀 있는 상태다.

## 5.4 이미지 저장

이미지는 모두 backend가 소유한다.

- 프로필 이미지: `ProfileImageStorageService`
- 티켓 이미지: `TicketImageStorageService`

저장 방식:

- 업로드/다운로드는 backend API를 경유
- 실제 바이트는 MinIO 버킷에 저장
- 브라우저에 반환하는 URL도 backend/프록시 경로 기준

이 방식은 브라우저에 MinIO 자격 증명을 노출하지 않는다는 점에서 현재 구조와 잘 맞는다.

## 6. 티켓팅 아키텍처

PERFO의 가장 중요한 비동기 구조는 티켓팅 구매 요청 처리다.

### 6.1 동기 쓰기 경로

```text
사용자
  -> frontend /api/ticketing/requests
  -> backend /api/ticketing/requests
  -> TicketingService
  -> PostgreSQL 트랜잭션
     - request ledger 기록
     - 이벤트 재고/번호 갱신
     - 티켓 생성
     - outbox 기록
  -> 즉시 응답 반환
```

`TicketingService`는 아래 규칙을 동기적으로 판정한다.

- 이벤트 존재 여부
- 이벤트 활성화 여부
- 판매 오픈/종료 시간
- 중복 구매 허용 여부
- 사용자별 최대 구매 수량
- 잔여 수량
- `requestId` 기반 멱등 처리

즉 재고 확정과 구매 성공/실패 판정은 backend 트랜잭션 안에서 끝난다.

### 6.2 비동기 후처리 경로

```text
TicketingService
  -> ticketing_outbox 저장
  -> TicketingOutboxRelayService 가 주기적으로 publish
  -> Kafka topic: ticketing.purchase-results
  -> TicketingProjectionConsumerService consume
  -> ticketing_purchase_projection 적재
  -> 운영/점검용 projection 조회 가능
```

이 구조의 목적:

- 메인 구매 트랜잭션과 후속 읽기 모델 갱신을 분리
- 발행 실패를 재시도 가능하게 유지
- projection 적재를 at-least-once 소비 방식으로 운영

현재 코드 기준 주의점:

- outbox relay는 `TICKETING_OUTBOX_RELAY_ENABLED=true`일 때만 돈다.
- projection consumer는 `TICKETING_PROJECTION_CONSUMER_ENABLED=true`일 때만 돈다.
- 즉 Kafka 파이프라인은 "구현되어 있지만 환경변수로 꺼둘 수 있는 선택적 실행 경로"다.

보호 장치:

- outbox status 기반 재시도
- retry count / backoff
- projection 테이블의 `outboxId` 중복 체크
- contract validation 실패 시 observability 기록

관련 상세 문서:

- `docs/01_Design/00_Architecture/05_KAFKA_HANDOFF.md`

### 6.3 Projection 조회 API

projection 조회는 운영/점검성 read API로 보인다.

- frontend route: `app/api/ticketing/events/[eventId]/projection/route.ts`
- backend route: `GET /api/ticketing/events/{eventId}/projection`

이 경로는 기본 비활성화이며 아래 조건이 모두 맞아야 열린다.

- `TICKETING_PROJECTION_READ_API_ENABLED=true`
- `TICKETING_PROJECTION_ALLOWED_USER_IDS` allowlist 포함

즉 사용자용 주 기능이라기보다 운영 가시성용 인터페이스다.

## 7. 데이터 저장 구조

## 7.1 Backend PostgreSQL

핵심 도메인 테이블 성격:

- 사용자
- 이벤트
- 티켓
- 검증 이력
- 티켓팅 요청 ledger
- 티켓팅 outbox
- 티켓팅 purchase projection

backend는 JPA 엔티티 + repository 패턴으로 접근한다.

## 7.2 Frontend Prisma PostgreSQL

`frontend/prisma/schema.prisma` 기준으로 frontend 서버 계층이 별도로 관리하는 데이터는 다음과 같다.

- `Notification`
- `PushSubscription`
- `NotificationDelivery`
- `TicketStatusSnapshot`

즉 PostgreSQL은 현재 "backend 도메인 DB"와 "frontend 알림/푸시 저장"이 같은 인프라를 공유할 수 있지만, 코드 관점에서는 접근 계층이 분리되어 있다.

## 7.3 파일/오브젝트 저장

- 프로필 이미지 버킷
- 티켓 이미지 버킷

MinIO 버킷 생성은 compose의 `minio-init`와 backend 서비스의 bucket ensure 로직이 함께 방어한다.

## 8. 현재 코드 기준 주요 경로

사용자 기능 기준 주요 흐름은 아래와 같다.

### 8.1 이벤트 조회

```text
Page -> frontend /api/events -> backend /api/events -> PostgreSQL
```

### 8.2 내 티켓 조회

```text
Page -> frontend /api/tickets -> backend /api/tickets?ownerUserId=... -> PostgreSQL
```

### 8.3 예약 조회 / QR 토큰 발급

```text
Page -> frontend /api/reservations -> backend /api/reservations
Page -> frontend route -> backend /api/reservations/{id}/qr-token
```

### 8.4 티켓팅 요청

```text
Page -> frontend /api/ticketing/requests -> backend /api/ticketing/requests
     -> ticketing transaction -> outbox -> Kafka -> projection
```

### 8.5 알림/푸시

```text
Browser -> frontend /api/push/subscribe
Browser -> frontend /api/notifications/*
Internal event -> frontend /api/internal/notifications/ticket-transition
```

## 9. 배포 및 운영 관점

현재 기준 운영 포인트는 다음과 같다.

- frontend와 backend는 분리 배포 가능
- `docker-compose.yml`이 로컬/단일서버 기준 실행 표준
- `docker-compose.bluegreen.yml`, `deploy/nginx/*`, 관련 스크립트로 blue-green 전환 준비가 되어 있음
- backend readiness는 `/api/health`, 관측은 `/actuator/health` 및 metrics 사용
- Kafka/Projection 경로는 feature flag 성격의 환경변수로 on/off 가능

## 10. 현재 구조와 목표 문서를 읽는 방법

- `docs/ARCHITECTURE.md`: 지금 실행되는 구조
- `docs/01_Design/00_Architecture/*`: 목표 구조, 설계 의도, 개선 방향
- 둘이 다르면 이 문서를 우선 현재 사실로 본다
- 목표 문서의 내용은 자동으로 구현 완료를 의미하지 않는다

## 11. 현재 아키텍처 해석 요약

현재 PERFO는 "모놀리식 저장소 안의 역할 분리형 2-tier 애플리케이션"에 가깝다.

- 사용자 진입점과 세션 관리는 frontend가 담당한다.
- 실제 비즈니스 상태 변경은 backend가 담당한다.
- 일부 부가 기능인 알림/푸시는 frontend 서버 계층이 자체 저장소를 가지는 준독립 서브시스템이다.
- 티켓팅은 backend 안에서만 끝나는 단순 CRUD가 아니라, outbox와 Kafka projection을 포함한 비동기 파이프라인 구조다.

문서상 가장 중요한 인식은 이것이다.

- `frontend`는 단순 프레젠테이션 계층이 아니다.
- `backend`는 단순 REST API 계층이 아니라 도메인 트랜잭션과 비동기 파이프라인의 중심이다.
- `notification`과 `ticketing projection`은 둘 다 부가 read/async 모델이지만, 서로 다른 런타임 계층에 놓여 있다.
