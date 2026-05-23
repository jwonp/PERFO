# 코드 분리 리팩토링 작업 프롬프트

> 목적: `26_CODE_SPLIT_REFACTORING_PLAN.md`를 실제 작업 단위로 실행하기 위한 순서형 프롬프트 모음이다.
>
> 사용 방식:
> - 한 번에 하나의 프롬프트만 실행한다.
> - 각 프롬프트는 독립 PR 또는 독립 commit 단위로 처리한다.
> - 기능 변경과 파일 분리 리팩토링을 섞지 않는다.
> - 각 단계 완료 후 테스트 결과와 남은 위험을 기록한다.

## 공통 시작 프롬프트

```txt
PERFO 코드 분리 리팩토링을 진행한다.

반드시 지킬 것:
- AGENTS.md와 docs/02_Development/00_Plan/26_CODE_SPLIT_REFACTORING_PLAN.md를 기준으로 작업한다.
- 기존 동작을 바꾸지 않는다.
- 기능 추가를 하지 않는다.
- 파일 이동, 함수 추출, 테스트 보강만 한다.
- `*.func.ts`에는 순수 함수만 둔다.
- `*.api.ts`에는 fetch/route 호출만 둔다.
- `*.hooks.ts`에는 React state/effect orchestration만 둔다.
- `page.tsx`는 최종적으로 조립만 하게 줄인다.
- 작업 전후 `git diff`를 확인하고, 내가 건드리지 않은 변경은 되돌리지 않는다.

먼저 현재 브랜치와 git status를 확인하고, 이번 작업 범위 밖 변경이 있으면 건드리지 말고 보고한다.
```

## 1. 기준선 확인

- [x] 현재 git status를 확인했다.
- [x] 프론트/백엔드 테스트 명령을 확인했다.
- [x] 현재 큰 파일 목록을 확인했다.
- [x] 리팩토링 우선순위와 이번 첫 PR 범위를 요약했다.

```txt
리팩토링 전 기준선을 확인해줘.

대상:
- frontend/package.json
- frontend/vitest.config.ts
- frontend/playwright.config.ts
- backend/build.gradle
- docs/02_Development/00_Plan/26_CODE_SPLIT_REFACTORING_PLAN.md

할 일:
1. 현재 git status를 확인한다.
2. 프론트/백엔드 테스트 명령을 확인한다.
3. 현재 큰 파일 목록을 확인한다.
4. 리팩토링 우선순위와 이번 첫 PR 범위를 요약한다.

코드 수정은 하지 말고 분석 결과만 정리한다.
```

완료 기준:

- 현재 변경 상태를 알고 있다.
- 첫 작업 범위가 `my-tickets` 순수 함수/API 분리로 고정되어 있다.

### 기준선 메모

- 작업트리 주의:
  - 현재 사용자 작업으로 보이는 변경이 이미 다수 존재한다. 확인된 변경 파일에는 `.gitignore`, `frontend/app/[locale]/(main)/my-tickets/page.tsx`, `frontend/app/[locale]/(main)/profile/page.tsx`, `frontend/app/layout.tsx`, `frontend/components/profile/ProfileAvatar.tsx`, `frontend/components/tickets/IssuedTicketCard.tsx`, `frontend/components/tickets/issued-ticket-card.types.ts`, `frontend/components/ui/badge.tsx`, `frontend/package.json`, `frontend/pnpm-lock.yaml` 및 다수의 `docs/**` 신규 파일이 포함된다.
  - 이번 리팩토링 중 위 변경은 되돌리거나 정리하지 않고, 현재 작업 범위 파일과 충돌하지 않게 보존한다.

- 테스트 명령 기준선:
  - 프론트 단위 테스트: `cd frontend && pnpm test:unit`
  - 프론트 커버리지: `cd frontend && pnpm test:coverage`
  - 프론트 E2E: `cd frontend && pnpm test:e2e`
  - 백엔드 테스트: `cd backend && ./gradlew test`

- 큰 파일 기준선:
  - `frontend/app/[locale]/(main)/my-tickets/page.tsx`: 768 lines
  - `frontend/lib/notifications/notification-service.ts`: 720 lines
  - `frontend/app/[locale]/(main)/my-tickets/__tests__/MyTicketsPage.test.tsx`: 718 lines
  - `backend/src/test/kotlin/com/perfo/backend/service/TicketServiceTest.kt`: 643 lines
  - `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`: 561 lines
  - `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx`: 534 lines
  - `frontend/app/[locale]/(main)/my-tickets/PlaceAutocompleteInput.tsx`: 534 lines
  - 참고: `pnpm-lock.yaml`, 생성 코드, 테스트 산출물, 이미지 에셋은 리팩토링 우선순위 산정에서 제외한다.

- 첫 리팩토링 범위 고정:
  - 이번 작업의 첫 섹션 이후 실제 코드 분리는 `frontend/app/[locale]/(main)/my-tickets/page.tsx`의 순수 함수/타입/상수 분리부터 시작한다.
  - 우선 추출 후보는 `mapTicket`, `statusBadgeStyle`, `toDateTimeLocalValue`, `toIsoDateTime`, `isFutureVerifyingRequest`, payload builder 계열 함수다.
  - `TicketFormSheet` 내부 로컬 상태와 브라우저 API(`URL.createObjectURL`, `URL.revokeObjectURL`)는 2번 섹션에서는 그대로 두고, 순수 함수만 `my-tickets.func.ts`로 이동한다.
  - `statusLabel`은 `t()` 의존성이 있어 순수 함수 분리 1차 대상에서 제외하고, 이후 상수 키 기반 변환 함수로 바꿀지 별도 검토한다.

- 검증 기록:
  - 이번 1번 섹션에서는 테스트를 실행하지 않았다.
  - 이유: 1번 “기준선 확인”의 요구사항은 분석과 범위 고정이며, 이번 턴 지시사항도 코드 수정 없이 문서 체크리스트/메모 업데이트만 수행하도록 제한되어 있다.

## 2. `my-tickets` 순수 함수 분리

- [x] `page.tsx` 안의 타입/상수 현황을 확인했다.
- [x] 순수 함수들을 `my-tickets.func.ts`로 이동했다.
- [x] 상태 맵/빈 폼/정적 옵션을 `my-tickets.constants.ts`에 정리했다.
- [x] payload 관련 타입을 `my-tickets.types.ts`에 정리했다.
- [x] 이동한 순수 함수 unit test를 추가했다.
- [x] `page.tsx`의 기존 동작을 유지했다.

```txt
`frontend/app/[locale]/(main)/my-tickets/page.tsx`에서 순수 함수와 타입/상수를 먼저 분리해줘.

대상 파일:
- frontend/app/[locale]/(main)/my-tickets/page.tsx
- frontend/app/[locale]/(main)/my-tickets/my-tickets.types.ts
- frontend/app/[locale]/(main)/my-tickets/my-tickets.constants.ts
- frontend/app/[locale]/(main)/my-tickets/my-tickets.func.ts
- 필요한 테스트 파일

할 일:
1. page.tsx 안의 타입이 이미 types/constants에 있는지 확인한다.
2. 아래 함수들을 `my-tickets.func.ts`로 이동한다.
   - mapTicket
   - statusBadgeStyle
   - toDateTimeLocalValue
   - toIsoDateTime
   - isFutureVerifyingRequest
   - buildTicketPayload 또는 기존 buildPayload에 해당하는 로직
   - buildCreateTicketPayload
   - buildPublicBookingUrl
3. 상태 맵/빈 폼/정적 옵션은 `my-tickets.constants.ts`에 둔다.
4. 타입은 `my-tickets.types.ts`에 둔다.
5. 이동한 순수 함수에 unit test를 추가한다.
6. page.tsx의 동작은 바꾸지 않는다.

검증:
- frontend에서 관련 unit test를 실행한다.
- 가능하면 `pnpm test:unit -- my-tickets` 또는 해당 테스트 파일만 실행한다.
```

완료 기준:

- `page.tsx`에서 순수 함수 정의가 제거되어 있다.
- `my-tickets.func.ts`는 브라우저 API와 React hook을 사용하지 않는다.
- 날짜 변환, payload builder, mapper 테스트가 있다.

### 작업 메모

- 분리 내용:
  - `mapTicket`, `statusBadgeStyle`, `toDateTimeLocalValue`, `toIsoDateTime`, `isFutureVerifyingRequest`, `buildTicketPayload`, `buildCreateTicketPayload`, `buildPublicBookingUrl`를 `my-tickets.func.ts`로 이동했다.
  - `buildPublicBookingUrl`은 순수 함수 규칙을 지키기 위해 `window.location.origin` 직접 접근 대신 `origin` 인자를 받도록 바꿨고, `page.tsx`가 브라우저 값을 주입한다.
  - 수정 상태 선택 옵션은 `ISSUE_STATUS_OPTIONS`로 `my-tickets.constants.ts`에 이동했다.
  - `TicketBasePayload`, `TicketUpdatePayload`, `IssueStatusOption` 타입을 `my-tickets.types.ts`에 추가했다.

### 검증 기록

- 실행 명령:
  - `cd frontend && pnpm exec vitest run 'app/[locale]/(main)/my-tickets/my-tickets.func.test.ts'`
  - `cd frontend && pnpm exec vitest run 'app/[locale]/(main)/my-tickets/__tests__/MyTicketsPage.test.tsx'`
- 결과:
  - `my-tickets.func.test.ts`: 8개 테스트 통과
  - `MyTicketsPage.test.tsx`: 16개 테스트 통과

## 3. `my-tickets` API client 분리

```txt
`my-tickets` 화면의 fetch 호출을 `my-tickets.api.ts`로 분리해줘.

대상 파일:
- frontend/app/[locale]/(main)/my-tickets/page.tsx
- frontend/app/[locale]/(main)/my-tickets/my-tickets.api.ts
- frontend/app/[locale]/(main)/my-tickets/my-tickets.func.ts
- 관련 테스트 파일

할 일:
1. page.tsx 내부 fetchJson, fetch("/api/tickets"), 이미지 upload/delete 호출을 찾는다.
2. 아래 API 함수를 만든다.
   - fetchIssuedTickets
   - createIssuedTicket
   - updateIssuedTicket
   - uploadTicketImage
   - cleanupTicketImage
3. API 함수는 response parsing과 에러 message 처리까지 담당한다.
4. page.tsx는 API 함수만 호출하게 바꾼다.
5. API 함수 테스트 또는 기존 page test mock을 깨지 않도록 조정한다.

검증:
- `MyTicketsPage.test.tsx` 관련 테스트를 실행한다.
- 타입 오류가 없는지 확인한다.
```

완료 기준:

- `page.tsx`에 직접 `fetch(` 호출이 남아 있지 않거나 최소화되어 있다.
- API 에러 처리 동작이 기존과 동일하다.

## 4. `my-tickets` hook 분리

```txt
`my-tickets`의 상태와 side-effect를 hook으로 분리해줘.

대상 파일:
- frontend/app/[locale]/(main)/my-tickets/page.tsx
- frontend/app/[locale]/(main)/my-tickets/use-my-tickets.hooks.ts
- frontend/app/[locale]/(main)/my-tickets/my-tickets.api.ts
- frontend/app/[locale]/(main)/my-tickets/my-tickets.func.ts

할 일:
1. 티켓 목록 로딩 useEffect를 hook으로 이동한다.
2. 생성/수정 submit orchestration을 hook으로 이동한다.
3. duplicateFilter, copiedTicketId, sheetOpen, editTarget 상태를 hook에서 관리하게 한다.
4. 알림 snapshot bootstrap 입력을 hook이나 별도 selector 함수로 정리한다.
5. page.tsx는 hook 결과와 handler를 컴포넌트에 전달만 하게 한다.

검증:
- MyTicketsPage 관련 unit test 실행.
- 생성, 수정, 이미지 업로드, 복사 URL 플로우 테스트가 유지되는지 확인.
```

완료 기준:

- `page.tsx`의 state/effect가 크게 줄어든다.
- hook은 UI className이나 JSX를 반환하지 않는다.

## 5. `my-tickets` UI 컴포넌트 분리

```txt
`my-tickets` 화면의 JSX를 컴포넌트로 분리해줘.

대상 구조:
- TicketFormSheet.tsx
- TicketList.tsx
- TicketFilterTabs.tsx
- page.tsx
- 필요 시 MyTicketsScreen.tsx

할 일:
1. 기존 page.tsx 내부 `TicketFormSheet`를 별도 파일로 이동한다.
2. 목록 렌더링을 `TicketList.tsx`로 이동한다.
3. 필터 탭을 `TicketFilterTabs.tsx`로 이동한다.
4. page.tsx는 `MyTicketsScreen` 조립 또는 최상위 렌더링만 담당하게 한다.
5. props 타입은 `my-tickets.types.ts`에 둔다.

검증:
- MyTicketsPage 테스트 실행.
- Playwright my-tickets spec 실행 가능하면 실행.
```

완료 기준:

- `page.tsx`가 100줄 이하에 가깝게 줄어든다.
- 각 컴포넌트는 props 기반 렌더링만 담당한다.

## 6. QR scanner 순수 함수/API 분리

```txt
QR scanner 페이지에서 순수 함수, 타입, 상수, API 호출을 먼저 분리해줘.

대상 파일:
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx
- scan.types.ts
- scan.constants.ts
- scan.func.ts
- scan.api.ts
- 관련 테스트

할 일:
1. 타입을 `scan.types.ts`로 이동한다.
2. 상수를 `scan.constants.ts`로 이동한다.
3. 아래 함수를 `scan.func.ts`로 이동한다.
   - resultLabelKey
   - resultMeta
   - formatUsedAt
   - shouldIgnoreDuplicateScan
4. 검표 fetch를 `scan.api.ts`의 `validateTicketQr`로 이동한다.
5. 순수 함수 unit test를 추가한다.

검증:
- TicketScanPage 관련 unit test 실행.
```

완료 기준:

- scanner page에서 순수 함수와 API fetch가 분리되어 있다.
- `scan.func.ts`에는 React/브라우저 API 접근이 없다.

## 7. QR scanner hook 분리

```txt
QR scanner의 카메라, 사운드, 검표 submit 로직을 hook으로 분리해줘.

대상 구조:
- use-qr-scanner.hooks.ts
- use-scan-audio.hooks.ts
- use-ticket-validation.hooks.ts
- page.tsx

할 일:
1. `BrowserMultiFormatReader` 초기화/정지를 `useQrScanner`로 이동한다.
2. AudioContext와 tone 재생을 `useScanAudio`로 이동한다.
3. submit/result/banner/manual focus 로직을 `useTicketValidation`으로 이동한다.
4. cooldown 처리는 pure function과 hook 조합으로 유지한다.
5. page.tsx는 hook을 조합해 UI에 전달한다.

검증:
- TicketScanPage unit test 실행.
- 가능하면 ticket-qr-flow e2e 실행.
```

완료 기준:

- page.tsx에서 camera/audio 세부 구현이 사라진다.
- hook cleanup이 유지된다.

## 8. QR scanner UI 컴포넌트 분리

```txt
QR scanner JSX를 작은 UI 컴포넌트로 분리해줘.

대상 구조:
- ScannerViewport.tsx
- ScanResultPanel.tsx
- ManualTokenEntry.tsx
- page.tsx

할 일:
1. video viewport와 overlay를 `ScannerViewport`로 이동한다.
2. 최근 결과 영역을 `ScanResultPanel`로 이동한다.
3. 수동 입력 영역을 `ManualTokenEntry`로 이동한다.
4. page.tsx는 layout과 hook 조합만 담당한다.

검증:
- TicketScanPage unit test 실행.
- 모바일 viewport에서 텍스트/버튼이 겹치지 않는지 확인한다.
```

완료 기준:

- scanner page가 조립 컴포넌트 수준으로 줄어든다.
- UI 컴포넌트는 QR decode 구현을 모른다.

## 9. BFF backend proxy helper 도입

```txt
frontend app/api route handler의 반복 backend proxy 코드를 공통 helper로 분리해줘.

대상 구조:
- frontend/lib/server/backend-proxy/backend-proxy.types.ts
- frontend/lib/server/backend-proxy/backend-proxy.func.ts
- frontend/lib/server/backend-proxy/backend-proxy-session.ts
- frontend/lib/server/backend-proxy/backend-proxy-client.ts
- frontend/lib/server/backend-proxy/backend-proxy-response.ts

할 일:
1. 현재 route handler 반복 패턴을 다시 확인한다.
2. `requireSessionUser`를 만든다.
3. `parseBackendResponse`와 `jsonFromBackendResponse`를 만든다.
4. `createBackendAuthHeaders` 또는 기존 internal proxy helper wrapper를 만든다.
5. 먼저 routes 2~3개만 적용한다.
   - `/api/tickets`
   - `/api/tickets/[ticketId]`
   - `/api/reservations`
6. 공통 helper 테스트를 추가한다.

검증:
- 적용한 route handler 테스트 실행.
- 기존 응답 status/body가 유지되는지 확인.
```

완료 기준:

- route handler 중복 제거 패턴이 검증된다.
- 한 번에 29개 전체를 바꾸지 않는다.

## 10. BFF route handler 단계적 적용

```txt
검증된 backend proxy helper를 나머지 app/api route handler에 단계적으로 적용해줘.

대상:
- frontend/app/api/events/**
- frontend/app/api/ticketing/**
- frontend/app/api/users/**
- frontend/app/api/reservations/**
- frontend/app/api/tickets/**

제외 또는 별도 판단:
- next-auth route
- push/notifications처럼 Next.js 내부 저장소를 직접 쓰는 route

할 일:
1. helper 적용 가능한 route 목록을 만든다.
2. 5개 이하 route 단위로 나눠 적용한다.
3. route별 고유 권한 scope가 바뀌지 않게 한다.
4. 테스트를 route 그룹별로 실행한다.

검증:
- route handler unit test 실행.
- 가능하면 `pnpm test:unit -- app/api` 실행.
```

완료 기준:

- backend proxy route는 대부분 같은 helper를 사용한다.
- 새 route 추가 시 복붙할 코드가 줄어든다.

## 11. notification repository/service 분리

```txt
`frontend/lib/notifications/notification-service.ts`를 repository와 service로 분리해줘.

대상 구조:
- notification.func.ts
- notification.repository.ts
- prisma-notification.repository.ts
- json-notification.repository.ts
- notification-delivery.service.ts
- notification-snapshot.service.ts
- notification-subscription.service.ts
- notification-service.ts

할 일:
1. 먼저 순수 함수만 `notification.func.ts`로 이동한다.
2. repository interface를 정의한다.
3. Prisma 구현과 JSON fallback 구현을 분리한다.
4. delivery, snapshot, subscription service를 분리한다.
5. 기존 exported function 이름은 유지해 route handler 영향 범위를 줄인다.

검증:
- notification-service 기존 테스트 실행.
- repository별 테스트를 추가하거나 기존 테스트를 분리한다.
```

완료 기준:

- `notification-service.ts`는 facade/orchestration만 담당한다.
- Prisma와 JSON fallback 분기가 핵심 service 로직 안에 직접 섞이지 않는다.

## 12. auth flow helper 분리

```txt
회원가입/검증/비밀번호 재설정 화면의 중복 helper를 분리해줘.

대상 구조:
- frontend/lib/auth/auth-flow.types.ts
- frontend/lib/auth/auth-flow.constants.ts
- frontend/lib/auth/auth-flow.func.ts
- frontend/lib/auth/auth-flow.storage.ts
- frontend/lib/auth/password-rules.func.ts

할 일:
1. 기존 `auth-flow.ts`를 types/constants/storage/func로 나눌 수 있는지 확인한다.
2. password rule 생성과 검증을 `password-rules.func.ts`로 이동한다.
3. sessionStorage 접근을 `auth-flow.storage.ts`로 이동한다.
4. signup, verify, reset-password page에서 중복 로직을 제거한다.
5. 단위 테스트를 추가한다.

검증:
- auth 관련 page test 실행.
- auth e2e 가능하면 실행.
```

완료 기준:

- password validation 규칙이 한 곳에만 있다.
- signup draft 저장/조회/삭제가 storage helper로만 수행된다.

## 13. 백엔드 `TicketService` policy 분리

```txt
백엔드 `TicketService.kt`에서 상태 전이와 이미지 검증을 먼저 분리해줘.

대상 구조:
- backend/src/main/kotlin/com/perfo/backend/service/ticket/IssuedTicketStatusPolicy.kt
- backend/src/main/kotlin/com/perfo/backend/service/ticket/TicketImageValidator.kt
- 기존 TicketService.kt
- 관련 테스트

할 일:
1. `resolveNextStatus`, `resolveEffectiveStatus`를 `IssuedTicketStatusPolicy`로 이동한다.
2. `detectSupportedImage`, upload file 크기/형식 검증을 `TicketImageValidator`로 이동한다.
3. 기존 public 동작은 유지한다.
4. policy와 validator 단위 테스트를 추가한다.

검증:
- `./gradlew test --tests '*TicketServiceTest'`
- 신규 policy/validator 테스트 실행.
```

완료 기준:

- `TicketService.kt`의 순수 정책 로직이 줄어든다.
- 상태 전이 테스트가 service mock 없이 가능하다.

## 14. 백엔드 issued ticket service 분리

```txt
`TicketService.kt`를 command/query/image/event-sync/notification 책임으로 나눠줘.

대상 구조:
- IssuedTicketCommandService.kt
- IssuedTicketQueryService.kt
- IssuedTicketEventSyncService.kt
- TicketImageService.kt
- IssuedTicketNotificationService.kt
- TicketService.kt 또는 controller wiring

할 일:
1. controller가 직접 호출할 facade를 유지할지 command/query로 바꿀지 결정한다.
2. 조회 로직을 query service로 이동한다.
3. 생성/수정/status update를 command service로 이동한다.
4. event sync를 별도 service로 이동한다.
5. notification bridge 호출을 별도 service로 이동한다.
6. 기존 테스트를 서비스별 테스트로 나눈다.

검증:
- `./gradlew test`
```

완료 기준:

- 단일 service가 500줄 이상인 상태가 해소된다.
- controller API 동작은 유지된다.

## 15. 최종 정리 프롬프트

```txt
코드 분리 리팩토링 전체 결과를 점검해줘.

할 일:
1. 400줄 이상 남은 소스 파일을 다시 찾는다.
2. `*.func.ts`에 브라우저 API, fetch, React hook이 들어갔는지 확인한다.
3. page.tsx가 조립 역할만 하는지 확인한다.
4. route handler 중복이 남아 있는지 확인한다.
5. 테스트 명령 결과를 정리한다.
6. 남은 리팩토링 후보를 P0/P1/P2로 정리한다.

코드 수정은 하지 말고 최종 리포트를 작성한다.
```

완료 기준:

- 남은 큰 파일과 책임 혼재 파일이 목록화된다.
- 다음 리팩토링 작업이 명확하다.
