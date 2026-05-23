# PERFO Security and Performance Audit

작성일: 2026-05-21
범위: `backend`, `frontend`, DB migration, Next.js API route, Spring service/controller 계층

## 요약

현재 코드 기준으로 즉시 조치가 필요한 보안 이슈는 3건이다.

1. 인증 없는 푸시 발송 API
2. 프로필 이미지 object key 임의 지정 가능성
3. QR 검표 권한 검증 누락

성능 관점에서는 발급 티켓 목록의 N+1 쿼리, 목록 API pagination 부재, 주요 조회 인덱스 부족이 우선순위가 높다. 의존성 감사에서는 `frontend` 기준 `pnpm audit --prod` 결과 high 10건, moderate 36건, low 4건이 확인되었다.

## 보안 이슈

### 1. 인증 없는 푸시 발송 API

심각도: High

위치:
- `frontend/app/api/push/send/route.ts`
- `frontend/lib/push/server.ts`

현황:
- `/api/push/send`는 세션, 내부 시크릿, 관리자 권한 검증 없이 `subscription`과 `payload`를 받아 `sendPushNotification`을 호출한다.
- 외부 요청자가 서버를 Web Push 발송 프록시처럼 사용할 수 있다.

영향:
- 임의 사용자 구독 endpoint로 스팸/피싱성 알림 발송 가능
- VAPID 키가 설정된 서버 자원 악용
- 알림 신뢰도 훼손

해결 방안:
- 사용하지 않는 테스트 API라면 route 파일을 삭제한다.
- 운영에 필요하다면 `INTERNAL_NOTIFICATION_SECRET` 또는 관리자 세션 검증을 추가한다.
- payload schema 검증, endpoint allowlist 또는 저장된 구독 대상만 발송하도록 제한한다.
- IP/user 기준 rate limit을 추가한다.

권장 조치:
- 1순위: `/api/push/send` 삭제
- 대체 발송 경로: `frontend/app/api/internal/notifications/ticket-transition/route.ts`처럼 내부 시크릿 기반 route만 유지

### 2. 프로필 이미지 object key 임의 지정 가능

심각도: High

위치:
- `backend/src/main/kotlin/com/perfo/backend/service/UserService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/ProfileImageStorageService.kt`
- `frontend/app/api/users/me/profile/route.ts`

현황:
- 프로필 PATCH에서 `profileImageType=UPLOADED`와 `profileImageValue`를 클라이언트가 직접 보낼 수 있다.
- 백엔드는 `UPLOADED` 타입에 대해 non-blank만 확인하고 object key prefix를 검증하지 않는다.
- 이후 프로필 이미지 조회 시 저장된 object key를 그대로 MinIO에서 읽는다.

영향:
- 다른 사용자의 업로드 object key를 추측하거나 획득한 경우 해당 이미지를 자신의 프로필 이미지로 연결할 수 있다.
- `/api/users/me/profile-image`를 통해 타 사용자 업로드 이미지가 노출될 수 있다.

해결 방안:
- `UPLOADED` 타입은 PATCH 요청에서 직접 설정하지 못하게 한다.
- 업로드 API가 반환한 key만 서버가 저장하도록 하고, 클라이언트 PATCH에서는 `NONE`, `PRESET`, 제한된 `PROVIDER`만 허용한다.
- 부득이하게 `UPLOADED` 값을 받는다면 `"$userId/"` prefix와 허용 문자 패턴을 강제한다.
- `PROFILE_IMAGE_TYPE=PROVIDER`도 외부 URL allowlist 또는 URL 형식 검증을 추가한다.

권장 조치:
- `normalizeProfileImage`에 현재 사용자 id를 전달해 `UPLOADED` prefix 검증을 추가한다.
- 더 안전한 방식은 프로필 PATCH에서 `UPLOADED` 타입 입력 자체를 거부하고, 업로드 endpoint만 업로드 이미지 상태를 변경하게 하는 것이다.

### 3. QR 검표 권한 검증 누락

심각도: High

위치:
- `frontend/app/api/tickets/[ticketId]/validations/route.ts`
- `backend/src/main/kotlin/com/perfo/backend/controller/TicketController.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketVerificationService.kt`

현황:
- 프론트 API route는 로그인 여부만 확인하고 백엔드로 검표 요청을 전달한다.
- 백엔드는 QR 토큰의 예약 ticketId, eventId, userId 일치 여부는 확인한다.
- 하지만 검표 요청자가 해당 발급 티켓 owner인지, organizer인지 확인하지 않는다.

영향:
- QR 토큰을 가진 임의 로그인 사용자가 티켓을 사용 처리할 수 있다.
- 현장 검표 권한 모델이 무력화될 수 있다.

해결 방안:
- `TicketController.validateTicketByQr`에서 인증 사용자 id를 서비스로 전달한다.
- `TicketVerificationService.validateTicketByQr`에서 `event.issuedTicketId` 또는 `IssuedTicket.eventId`를 통해 발급 티켓을 조회하고 `ownerUserId == authenticatedUserId`를 검증한다.
- 추후 팀 검표 권한이 필요하면 별도 `staff` 또는 `organizer_members` 권한 테이블을 둔다.

권장 조치:
- 우선은 발급자 본인만 검표 가능하도록 서버 검증을 추가한다.
- 프론트에서 scanner 화면 접근을 숨기는 것은 보조 수단이며, 서버 권한 검증이 반드시 필요하다.

### 4. 인증/인증코드 rate limit 부재 및 계정 열거

심각도: Medium

위치:
- `backend/src/main/kotlin/com/perfo/backend/service/AuthService.kt`
- `backend/src/main/kotlin/com/perfo/backend/controller/AuthController.kt`
- `frontend/app/api/auth/check-email/route.ts`
- `frontend/app/api/auth/verification-codes/request/route.ts`

현황:
- 로그인, 인증코드 발급, 인증코드 검증에 실패 횟수 제한이나 쿨다운이 없다.
- `User not found`, `Invalid password`, provider 정보 등으로 계정 존재 여부와 로그인 방식을 구분할 수 있다.
- 6자리 인증코드는 bcrypt hash로 저장되지만, 온라인 검증 시도 제한이 없으면 brute force 위험이 남는다.

영향:
- 계정 열거
- 인증코드 발송 남용
- 인증코드 brute force
- 메일 발송 비용 증가

해결 방안:
- IP + email 기준 rate limit을 추가한다.
- 인증코드 요청은 동일 email/purpose 기준 쿨다운을 둔다.
- 인증코드 검증 실패 횟수를 저장하고 일정 횟수 초과 시 해당 code를 폐기한다.
- 외부 응답 메시지는 `인증 정보가 올바르지 않습니다`처럼 평준화한다.
- 내부 로그에는 상세 사유를 남긴다.

### 5. 사용자 역할 값은 있지만 권한 정책이 거의 없음

심각도: Medium

위치:
- `backend/src/main/kotlin/com/perfo/backend/config/HeaderAuthenticationFilter.kt`
- `backend/src/main/kotlin/com/perfo/backend/config/SecurityConfig.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
- `frontend/lib/auth/auth-flow.ts`

현황:
- `USER`, `ORGANIZER` 역할 값은 존재한다.
- 하지만 백엔드 API 권한 판단은 대부분 authenticated 여부와 owner id 비교에 머문다.
- 모든 로그인 사용자가 발급 티켓 생성 API를 호출할 수 있다.

영향:
- 의도한 서비스 정책이 organizer-only라면 권한 우회가 된다.
- 프론트 UI에서 버튼을 숨겨도 API 직접 호출로 우회 가능하다.

해결 방안:
- 발급/검표/관리 API에 명시적 role check를 추가한다.
- Spring Security authority를 구성하거나 서비스 계층에서 `InternalAuthenticatedUser.role`을 검증한다.
- 역할 정책을 문서화한다. 예: `USER`는 예약만 가능, `ORGANIZER`는 발급/검표 가능.

## 성능 이슈

### 1. 발급 티켓 목록 N+1 쿼리

심각도: Medium

위치:
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`

현황:
- `findAllByOwnerUserId`가 발급 티켓 목록을 조회한다.
- 각 티켓의 `toResponse`에서 `resolveIssuedCount`를 호출한다.
- `resolveIssuedCount`는 각 티켓마다 `eventRepository.findById`를 실행한다.

영향:
- 발급 티켓 N개 조회 시 이벤트 조회가 최대 N번 추가된다.
- 티켓 수가 늘면 마이티켓 화면 응답 시간이 선형으로 악화된다.

해결 방안:
- 목록 조회 시 `eventId`를 모아 `eventRepository.findAllById(eventIds)`를 한 번 호출한다.
- `toResponse`가 `eventsById` map을 받도록 분리한다.
- 더 장기적으로는 issued ticket + event summary projection query를 만든다.

참고:
- `ReservationService.findAllByUserId`
- `EventQueryService.listPublicEvents`

위 두 서비스는 이미 batch 조회 패턴을 사용한다.

### 2. 목록 API pagination 부재

심각도: Medium

위치:
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/ReservationService.kt`
- `frontend/lib/notifications/notification-service.ts`

현황:
- 발급 티켓 목록, 예약 목록, 알림 목록이 전체 데이터를 반환한다.
- 알림 목록은 사용자의 notification 전체와 snapshot 전체를 동시에 가져온다.

영향:
- 장기 사용 시 응답 지연과 메모리 사용량 증가
- 모바일 환경에서 초기 로딩 악화
- DB 부하 증가

해결 방안:
- `limit`, `cursor`, `createdAt/id` 기반 pagination을 추가한다.
- 알림은 최근 20~50개 기본 조회로 제한한다.
- unread count는 현재처럼 count query를 유지한다.

### 3. 주요 조회 인덱스 부족

심각도: Medium

위치:
- `backend/src/main/resources/db/migration`
- `backend/src/main/kotlin/com/perfo/backend/repository/IssuedTicketRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/TicketRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/EventRepository.kt`

현황:
- 아래 조회 패턴이 자주 쓰이지만 migration에 대응 인덱스가 부족하다.
  - `issued_tickets.owner_user_id order by id desc`
  - `issued_tickets.status, open_at`
  - `issued_tickets.status, valid_date`
  - `tickets.user_id order by id desc`
  - `tickets.event_id, user_id`
  - `events.active, discovery_mode, sale_open_at, id`

해결 방안:
- 다음 migration을 추가한다.

```sql
create index if not exists idx_issued_tickets_owner_id_desc
    on issued_tickets (owner_user_id, id desc);

create index if not exists idx_issued_tickets_status_open_at
    on issued_tickets (status, open_at);

create index if not exists idx_issued_tickets_status_valid_date
    on issued_tickets (status, valid_date);

create index if not exists idx_tickets_user_id_desc
    on tickets (user_id, id desc);

create index if not exists idx_tickets_event_user
    on tickets (event_id, user_id);

create index if not exists idx_events_public_listing
    on events (active, discovery_mode, sale_open_at, id);
```

주의:
- 실제 운영 DB 크기와 write 부하를 보고 인덱스 수를 조정한다.
- PostgreSQL 운영 환경에서는 필요 시 `create index concurrently`를 사용한다.

### 4. 스케줄러 일괄 처리 부하

심각도: Low to Medium

위치:
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`

현황:
- `reconcileIssuedTicketStatuses`가 대상 티켓을 모두 가져온 뒤 루프에서 저장, 이벤트 동기화, 알림 발송을 수행한다.

영향:
- 만료/오픈 대상이 많을 때 긴 transaction과 많은 개별 update가 발생할 수 있다.

해결 방안:
- batch size를 두고 페이지 단위 처리한다.
- 상태 변경은 bulk update와 outbox 이벤트 생성으로 분리한다.
- 알림 발송은 transaction 밖 outbox worker가 처리하도록 한다.

## 의존성 취약점

검사 명령:

```bash
cd frontend
pnpm audit --prod
```

결과:
- 총 50건
- high 10건
- moderate 36건
- low 4건

주요 직접 의존성:
- `axios@1.13.6`: 여러 high/moderate advisory 확인, `>=1.15.2` 이상 필요
- `ws@8.19.0`: moderate advisory 확인, `>=8.20.1` 이상 필요

주요 transitive 의존성:
- `prisma -> @prisma/dev -> hono`
- `prisma -> @prisma/config -> effect`
- `prisma -> @prisma/dev -> @hono/node-server`
- `next-intl -> @parcel/watcher -> picomatch`

해결 방안:
- `axios`를 최소 `1.15.2` 이상으로 업데이트한다.
- `ws`를 최소 `8.20.1` 이상으로 업데이트한다.
- `prisma` CLI가 production runtime에 필요 없으면 `devDependencies`로 이동하고 `@prisma/client`만 production dependency로 유지한다.
- `pnpm update` 또는 dependency override로 transitive 패치를 적용한 뒤 lockfile을 갱신한다.
- 업데이트 후 `pnpm audit --prod`, `pnpm build`, `pnpm test:unit`, 주요 e2e를 실행한다.

## 권장 작업 순서

### Phase 0: 즉시 차단

1. `/api/push/send` 삭제 또는 내부 인증 추가
2. 프로필 PATCH에서 `UPLOADED` object key 직접 설정 차단
3. QR 검표 API에 발급자/검표자 권한 검증 추가

### Phase 1: 인증 방어 강화

1. 로그인 실패 rate limit
2. 인증코드 요청 쿨다운
3. 인증코드 검증 실패 횟수 제한
4. 외부 인증 오류 메시지 평준화

### Phase 2: 성능 개선

1. 발급 티켓 목록 N+1 제거
2. 목록 API pagination 추가
3. DB 조회 인덱스 migration 추가
4. 스케줄러 batch 처리 검토

### Phase 3: 의존성 정리

1. `axios`, `ws` 업데이트
2. `prisma` dependency 위치 재검토
3. transitive advisory 해결
4. `pnpm audit --prod` 재실행

## 검증 계획

### 보안 테스트

- 인증 없는 `/api/push/send` 요청이 실패하거나 route가 존재하지 않는지 확인
- 다른 사용자 prefix의 profile image key를 PATCH로 저장할 수 없는지 확인
- 발급자가 아닌 사용자가 QR 검표 요청 시 403을 받는지 확인
- 로그인/인증코드 요청 반복 시 rate limit이 동작하는지 확인

### 성능 테스트

- 발급 티켓 100개 이상 보유 사용자 목록 조회에서 SQL query 수 확인
- pagination 적용 후 첫 페이지 응답 시간 확인
- 인덱스 적용 전후 `EXPLAIN ANALYZE` 비교

### 회귀 테스트

```bash
cd backend
./gradlew test

cd ../frontend
pnpm test:unit
pnpm build
pnpm audit --prod
```

필요 시 핵심 e2e:

```bash
cd frontend
pnpm exec playwright test e2e/ticket-qr-flow.spec.ts --project=chromium
pnpm exec playwright test e2e/my-tickets.spec.ts --project=chromium
```

## 참고 코드 위치

- `frontend/app/api/push/send/route.ts`
- `frontend/app/api/internal/notifications/ticket-transition/route.ts`
- `frontend/app/api/tickets/[ticketId]/validations/route.ts`
- `frontend/app/api/users/me/profile/route.ts`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketVerificationService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/UserService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/AuthService.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/IssuedTicketRepository.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/TicketRepository.kt`
