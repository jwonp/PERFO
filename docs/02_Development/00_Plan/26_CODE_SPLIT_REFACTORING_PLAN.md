# 코드 분리 리팩토링 계획

> 목적: 바이브 코딩 과정에서 커진 파일을 기능 단위로 나누고, `*.types.ts`, `*.constants.ts`, `*.func.ts`, `*.api.ts`, `*.hooks.ts`, `*.tsx` 역할을 명확히 해 이후 기능 추가와 테스트 작성을 쉽게 만든다.
>
> 기준 코드:
> - `frontend/app/[locale]/(main)/my-tickets/page.tsx`
> - `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx`
> - `frontend/lib/notifications/notification-service.ts`
> - `frontend/app/api/**/route.ts`
> - `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`

## 1. 문제 정의

현재 코드에는 한 파일이 여러 책임을 동시에 갖는 경우가 많다.

- 페이지 파일이 UI, 상태 관리, API 호출, DTO 변환, 파일 업로드, 브라우저 API 접근까지 함께 처리한다.
- route handler마다 세션 확인, 내부 JWT 생성, 백엔드 fetch, 응답 파싱, 에러 응답 생성이 반복된다.
- 서비스 파일이 repository 접근, fallback 저장소, push delivery, snapshot sync, DTO mapping을 한 번에 처리한다.
- 타입, 상수, 순수 함수가 컴포넌트 파일 내부에 섞여 있어 테스트하기 어렵다.

이 리팩토링은 동작을 바꾸는 작업이 아니라, 기존 동작을 보존하면서 파일 책임을 분리하는 구조 개선 작업이다.

## 2. 파일 분리 규칙

새 코드와 수정되는 기존 코드는 아래 suffix 규칙을 따른다.

| suffix | 책임 |
| --- | --- |
| `*.types.ts` | 타입, interface, union, props, DTO 타입 |
| `*.constants.ts` | 상태 맵, 옵션 배열, 제한값, 정적 copy key |
| `*.func.ts` | 순수 함수. mapper, formatter, validator, payload builder |
| `*.api.ts` | fetch, route 호출, 외부 API 호출 client |
| `*.hooks.ts` | React hook, 상태와 side-effect 묶음 |
| `*.tsx` | React 컴포넌트 렌더링 |
| `*.test.ts` | 순수 함수, API helper, service 테스트 |
| `*.test.tsx` | 컴포넌트와 hook 사용자 동작 테스트 |

`*.func.ts`에는 아래 성격의 코드만 둔다.

- 같은 입력이면 같은 출력을 반환한다.
- React hook을 호출하지 않는다.
- `fetch`, `window`, `document`, `navigator`, `localStorage`, `sessionStorage`에 직접 접근하지 않는다.
- 현재 시각이 필요하면 `now`를 인자로 받는다.

브라우저 API에 접근하는 코드는 `*.hooks.ts`, `*.client.ts`, 또는 컴포넌트 내부에 둔다.

## 3. 공통 분리 원칙

1. `page.tsx`는 라우트 조립만 담당한다.
2. 컴포넌트 props와 도메인 타입은 같은 feature 폴더의 `*.types.ts`로 뺀다.
3. 상태별 label, style map, 옵션 배열은 `*.constants.ts`로 뺀다.
4. DTO 변환, 날짜 변환, payload builder는 `*.func.ts`로 뺀다.
5. fetch 호출은 `*.api.ts`로 뺀다.
6. `useState`, `useEffect`, `useMemo`, `useCallback`이 많은 로직은 `*.hooks.ts`로 뺀다.
7. 파일 하나가 200줄을 넘으면 분리 후보, 400줄을 넘으면 분리 대상, 600줄 이상은 우선 리팩토링 대상으로 본다.
8. 공통화는 2곳 이상에서 실제로 재사용될 때만 `shared`로 올린다.
9. `*.func.ts`를 잡동사니 유틸 파일로 만들지 않는다. 기능 단위 파일명, 예를 들면 `my-tickets.func.ts`, `scan.func.ts`를 사용한다.

## 4. 1차 대상: `my-tickets`

현재 `frontend/app/[locale]/(main)/my-tickets/page.tsx`는 티켓 목록, 생성/수정 폼, 이미지 업로드, API 호출, public URL 복사/공유, 알림 snapshot bootstrap까지 담당한다.

### 목표 구조

```txt
frontend/app/[locale]/(main)/my-tickets/
├── page.tsx
├── my-tickets.types.ts
├── my-tickets.constants.ts
├── my-tickets.func.ts
├── my-tickets.api.ts
├── use-my-tickets.hooks.ts
├── TicketFormSheet.tsx
├── TicketList.tsx
├── TicketFilterTabs.tsx
├── PlaceAutocompleteInput.tsx
└── place-utils.ts
```

### 파일별 책임

`my-tickets.types.ts`

- `IssuedTicket`
- `TicketForm`
- `IssueStatus`
- `DiscoveryMode`
- `DuplicatePurchaseFilter`
- `TicketFormSheetProps`

`my-tickets.constants.ts`

- `EMPTY_FORM`
- `STATUS_BADGE_STYLE`
- 필터 옵션
- 이미지 허용 MIME
- 기본 placeholder 값

`my-tickets.func.ts`

- `mapTicket`
- `statusLabelKey`
- `statusBadgeStyle`
- `toDateTimeLocalValue`
- `toIsoDateTime`
- `isFutureVerifyingRequest`
- `buildTicketPayload`
- `buildCreateTicketPayload`
- `buildPublicBookingUrl`

`my-tickets.api.ts`

- `fetchIssuedTickets`
- `createIssuedTicket`
- `updateIssuedTicket`
- `uploadTicketImage`
- `cleanupTicketImage`

`use-my-tickets.hooks.ts`

- 티켓 목록 로딩
- 생성/수정 submit orchestration
- 복사/공유 상태
- 필터링 상태
- 알림 snapshot bootstrap 입력 구성

`TicketFormSheet.tsx`

- 발급/수정 bottom sheet UI
- 폼 입력 렌더링
- 폼 내부 validation 표시

`TicketList.tsx`

- 빈 상태 렌더링
- `IssuedTicketCard` 목록 렌더링

`TicketFilterTabs.tsx`

- 중복 구매 허용 필터 탭 렌더링

### 완료 기준

- `page.tsx`는 `MyTicketsScreen` 또는 같은 수준의 조립 컴포넌트만 렌더링한다.
- `my-tickets.func.ts`는 unit test로 날짜 변환, mapper, payload builder를 검증한다.
- 기존 `MyTicketsPage.test.tsx`는 사용자 플로우 중심으로 유지한다.
- API 호출 mocking은 `my-tickets.api.ts` 단위에서 분리한다.

## 5. 2차 대상: QR scanner

현재 `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx`는 카메라 초기화, QR decode, 중복 스캔 cooldown, 검표 API 호출, 결과 사운드, 수동 입력, UI를 모두 담당한다.

### 목표 구조

```txt
frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/
├── page.tsx
├── scan.types.ts
├── scan.constants.ts
├── scan.func.ts
├── scan.api.ts
├── use-qr-scanner.hooks.ts
├── use-scan-audio.hooks.ts
├── use-ticket-validation.hooks.ts
├── ScannerViewport.tsx
├── ScanResultPanel.tsx
└── ManualTokenEntry.tsx
```

### 파일별 책임

`scan.types.ts`

- `ValidationResponse`
- `ScannerStatus`
- `VisualState`
- `SubmissionSource`

`scan.constants.ts`

- `SCAN_COOLDOWN_MS`
- `RESULT_BANNER_MS`
- `VISUAL_FEEDBACK_MS`

`scan.func.ts`

- `resultLabelKey`
- `resultMeta`
- `formatUsedAt`
- `shouldIgnoreDuplicateScan`

`scan.api.ts`

- `validateTicketQr`

`use-qr-scanner.hooks.ts`

- `BrowserMultiFormatReader` 초기화/정지
- decoded text cooldown 처리
- scanner status 관리

`use-scan-audio.hooks.ts`

- `AudioContext` prime
- 성공/실패 tone 재생
- unmount 시 close 처리

`use-ticket-validation.hooks.ts`

- submit 상태
- result/banner 상태
- manual input focus 처리

### 완료 기준

- 카메라 권한 차단, QR 성공, QR 실패, 수동 입력 흐름이 기존 테스트로 유지된다.
- `scan.func.ts`는 pure unit test를 갖는다.
- UI 컴포넌트는 camera/audio 구현 세부사항을 알지 않는다.

## 6. 3차 대상: notification service

현재 `frontend/lib/notifications/notification-service.ts`는 Prisma 저장소와 JSON fallback 저장소, delivery 기록, subscription 비활성화, snapshot sync, push 발송을 한 파일에서 처리한다.

### 목표 구조

```txt
frontend/lib/notifications/
├── notification.types.ts
├── notification.constants.ts
├── notification.func.ts
├── notification-service.ts
├── notification-delivery.service.ts
├── notification-snapshot.service.ts
├── notification-subscription.service.ts
├── notification.repository.ts
├── prisma-notification.repository.ts
└── json-notification.repository.ts
```

### 파일별 책임

`notification.func.ts`

- `nowIso`
- `snapshotId`
- `toPushSubscription`
- `toNotificationListItem`

`notification.repository.ts`

- `NotificationRepository` interface
- notification, delivery, subscription, snapshot CRUD 계약

`prisma-notification.repository.ts`

- Prisma 기반 CRUD

`json-notification.repository.ts`

- 개발 fallback용 JSON store CRUD

`notification-delivery.service.ts`

- push 발송
- delivery 기록
- subscription 실패 처리

`notification-snapshot.service.ts`

- snapshot upsert/get/bootstrap/sync

`notification-service.ts`

- 외부 route handler에서 호출하는 facade
- 각 service 조합만 담당

### 완료 기준

- repository 구현 교체가 service 호출부에 영향을 주지 않는다.
- JSON fallback은 개발 전용임을 코드와 문서에서 명확히 한다.
- 기존 `notification-service.test.ts`를 repository/service 단위로 나눈다.

## 7. 4차 대상: BFF route handler

현재 `frontend/app/api/**/route.ts` 29개에는 반복되는 backend proxy 코드가 많다.

### 목표 구조

```txt
frontend/lib/server/backend-proxy/
├── backend-proxy.types.ts
├── backend-proxy.constants.ts
├── backend-proxy.func.ts
├── backend-proxy-session.ts
├── backend-proxy-client.ts
└── backend-proxy-response.ts
```

### 파일별 책임

`backend-proxy-session.ts`

- `requireSessionUser`
- role 검증 helper

`backend-proxy-client.ts`

- `createBackendAuthHeaders`
- `proxyBackendJson`
- `proxyBackendMultipart`

`backend-proxy-response.ts`

- `parseBackendResponse`
- `jsonFromBackendResponse`
- `backendConfigError`
- `unauthorizedError`

`backend-proxy.func.ts`

- URL path builder
- query string builder
- safe JSON parsing

### 완료 기준

- route handler 하나가 보통 30~60줄 수준으로 줄어든다.
- 세션 없음, `BACKEND_URL` 없음, 내부 JWT signing 실패, 백엔드 error passthrough 동작이 공통 테스트로 검증된다.
- route별 테스트는 endpoint 고유 동작만 검증한다.

## 8. 5차 대상: auth flow

회원가입, 검증, 비밀번호 재설정 화면에는 password rule, draft 저장, verification flow가 반복된다.

### 목표 구조

```txt
frontend/lib/auth/
├── auth-flow.types.ts
├── auth-flow.constants.ts
├── auth-flow.func.ts
├── auth-flow.storage.ts
└── password-rules.func.ts
```

### 파일별 책임

`password-rules.func.ts`

- `buildPasswordRules`
- `isPasswordValid`
- `passwordsMatch`

`auth-flow.storage.ts`

- `saveSignUpDraft`
- `readSignUpDraft`
- `clearSignUpDraft`

`auth-flow.func.ts`

- purpose/mode 변환
- callback URL 정규화
- auth error message mapping

### 완료 기준

- signup, verify, reset-password page에서 password validation 중복이 사라진다.
- sessionStorage 접근은 storage helper로만 수행한다.
- 비밀번호 규칙은 pure unit test로 검증한다.

## 9. 백엔드 파일 분리 방향

Kotlin은 JPA entity 특성 때문에 `*.types.ts` 같은 suffix를 그대로 적용하지 않는다. 대신 package와 service 책임을 나눈다.

### `TicketService.kt` 분리 목표

```txt
backend/src/main/kotlin/com/perfo/backend/service/ticket/
├── IssuedTicketCommandService.kt
├── IssuedTicketQueryService.kt
├── IssuedTicketStatusPolicy.kt
├── IssuedTicketEventSyncService.kt
├── TicketImageService.kt
├── TicketImageValidator.kt
└── IssuedTicketNotificationService.kt
```

분리 기준:

- 상태 전이 규칙은 `IssuedTicketStatusPolicy`
- 이미지 magic byte 검증은 `TicketImageValidator`
- MinIO 저장/삭제 orchestration은 `TicketImageService`
- issued ticket과 event 동기화는 `IssuedTicketEventSyncService`
- 알림 bridge 호출은 `IssuedTicketNotificationService`
- controller가 호출하는 facade는 command/query service로 둔다.

### 완료 기준

- `TicketService.kt`는 제거하거나 facade 수준으로 축소한다.
- 상태 전이와 이미지 검증은 단위 테스트가 있다.
- event sync policy는 티켓 상태별 active/discovery/sale time 결과를 테스트한다.

## 10. 실행 순서

1. 순수 함수부터 분리한다.
2. 분리한 순수 함수에 unit test를 붙인다.
3. API 호출을 `*.api.ts`로 뺀다.
4. 상태와 side-effect를 hook으로 뺀다.
5. UI 컴포넌트를 분리한다.
6. route handler 공통 helper를 만든다.
7. 알림 repository/service를 분리한다.
8. 백엔드 service policy 분리를 진행한다.

각 단계는 기존 동작을 유지하는 리팩토링 PR로 처리하고, 기능 추가 PR과 섞지 않는다.

## 11. PR 분리안

1. `refactor(frontend): extract my-tickets pure functions and api client`
2. `refactor(frontend): split my-tickets form and list components`
3. `refactor(frontend): extract scanner hooks and helpers`
4. `refactor(frontend): introduce backend proxy helpers`
5. `refactor(frontend): split notification repository and services`
6. `refactor(frontend): normalize auth flow helpers`
7. `refactor(backend): split issued ticket policy and image services`

## 12. 검증 계획

프론트엔드:

- `pnpm lint`
- `pnpm test:unit`
- `pnpm test:e2e` 중 auth, my-tickets, ticket-qr-flow 우선 실행

백엔드:

- `./gradlew test`
- `TicketServiceTest` 분리 후 신규 policy/service 테스트 추가
- controller role test 추가

수동 확인:

- 일반 사용자는 `my-tickets`에 접근할 수 없어야 한다.
- organizer는 티켓 생성/수정/스캔에 접근할 수 있어야 한다.
- 티켓 생성, 이미지 업로드, 예매, QR 검표 흐름이 기존과 동일해야 한다.

## 13. 금지 사항

- 파일 이동과 기능 변경을 한 PR에 섞지 않는다.
- route handler마다 같은 proxy helper를 다시 작성하지 않는다.
- `*.func.ts`에 브라우저 API, fetch, React hook을 넣지 않는다.
- `shared`에 feature 전용 함수를 성급하게 올리지 않는다.
- 테스트 없이 mapper와 payload builder를 이동하지 않는다.

