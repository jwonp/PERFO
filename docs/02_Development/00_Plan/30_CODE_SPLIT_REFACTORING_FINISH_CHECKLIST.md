# 코드 분리 리팩토링 종료 체크리스트

> 목적: 이번 코드 분리 리팩토링의 종료 범위를 명확히 고정한다.
>
> 원칙:
> - 완벽주의로 범위를 계속 늘리지 않는다.
> - 이번 문서에 적힌 항목까지만 완료하면 이번 리팩토링은 종료로 본다.
> - 기능 추가, 디자인 변경, API 스펙 변경은 이번 범위에 포함하지 않는다.

## 1. 종료 범위

이번 리팩토링은 아래 4개 축이 끝나면 종료한다.

1. 주요 페이지 3개를 조립형 `page.tsx`로 정리
2. auth backend proxy 성격 route 중복 정리
3. notifications/push 내부 route 반복 패턴 정리
4. 남은 대형 백엔드 테스트 파일 1개 분리

## 2. 완료 대상

### 2.1 페이지 리팩토링

- [x] `frontend/app/[locale]/(main)/notifications/page.tsx`
- [x] `frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx`
- [x] `frontend/app/[locale]/(main)/profile/page.tsx`

완료 기준:

- [x] `page.tsx`가 화면 조립 역할만 한다.
- [x] fetch, polling, storage 접근, navigation branching, business rule이 hook 또는 helper로 이동한다.
- [x] 기존 사용자 동작은 유지된다.
- [x] 관련 unit test 또는 page test가 유지되거나 보강된다.

### 2.2 auth route 공통화

- [x] `frontend/app/api/auth/check-email/route.ts`
- [x] `frontend/app/api/auth/password-reset/route.ts`
- [x] `frontend/app/api/auth/verification-codes/request/route.ts`
- [x] `frontend/app/api/auth/verification-codes/verify/route.ts`
- [x] `frontend/app/api/auth/signup/verified/route.ts`

완료 기준:

- [x] `BACKEND_URL` 체크, upstream fetch, JSON fallback, 에러 응답 패턴이 공통 helper 또는 공통 함수로 정리된다.
- [x] route별 응답 status와 message 동작은 유지된다.
- [x] 기존 auth page test가 깨지지 않는다.

### 2.3 notifications / push route 정리

- [x] `frontend/app/api/notifications/route.ts`
- [x] `frontend/app/api/notifications/read-all/route.ts`
- [x] `frontend/app/api/notifications/[notificationId]/read/route.ts`
- [x] `frontend/app/api/notifications/bootstrap/route.ts`
- [x] `frontend/app/api/notifications/unread-count/route.ts`
- [x] `frontend/app/api/push/subscribe/route.ts`

완료 기준:

- [x] session user 확인 패턴이 정리된다.
- [x] unauthorized / not found / server error 응답 패턴이 중복 없이 정리된다.
- [x] notification-service facade 구조를 유지한다.
- [x] 내부 저장소 route라는 특성은 유지한다.

### 2.4 백엔드 테스트 파일 분리

- [x] `backend/src/test/kotlin/com/perfo/backend/controller/TicketControllerTest.kt`

완료 기준:

- [x] 500줄이 넘는 단일 테스트 파일 상태를 해소한다.
- [x] endpoint 그룹 또는 책임 기준으로 테스트 클래스를 나눈다.
- [x] controller API 검증 범위는 유지한다.

## 3. 이번 범위에서 제외

아래는 이번 리팩토링 종료 조건에 포함하지 않는다.

- [ ] generated code 정리
- [ ] 디자인 리뉴얼
- [ ] 신규 기능 추가
- [ ] API 스펙 변경
- [ ] 백엔드 service의 추가 미세 분리
- [ ] 테스트 100% 재구성
- [ ] “더 예쁘게” 수준의 후속 정리

## 4. 공통 규칙

- [x] `*.func.ts`에는 순수 함수만 둔다.
- [x] `*.api.ts`에는 fetch / route 호출만 둔다.
- [x] `*.hooks.ts`에는 React state / effect orchestration만 둔다.
- [x] `page.tsx`는 최종 조립만 담당하게 줄인다.
- [x] 기존 동작은 바꾸지 않는다.
- [x] 범위 밖 dirty 변경은 건드리지 않는다.
- [x] 파일 수정은 항상 최소 범위로 한다.

## 5. 최종 완료 판정

아래를 모두 만족하면 이번 리팩토링은 종료다.

- [x] 프로덕션 소스 기준 400줄 이상 파일이 없다.
  - generated code, test file 제외
- [x] 주요 사용자 페이지의 `page.tsx`가 조립 역할만 한다.
- [x] `*.func.ts`에 브라우저 API, fetch, React hook이 없다.
- [x] auth/backend proxy route의 반복 boilerplate가 정리되어 있다.
- [x] notifications/push route의 반복 session/response 패턴이 정리되어 있다.
- [x] 관련 테스트가 통과한다.

## 6. 검증 명령

### 프론트

- [x] `cd frontend && pnpm exec vitest run 'app/[locale]/(auth)/login/__tests__/LoginPage.test.tsx' 'app/[locale]/(auth)/login/password/__tests__/PasswordLoginPage.test.tsx' 'app/[locale]/(auth)/signup/__tests__/SignUpPage.test.tsx' 'app/[locale]/(auth)/verify/__tests__/VerifyPage.test.tsx' 'app/[locale]/(auth)/reset-password/__tests__/ResetPasswordPage.test.tsx'`
- [x] `cd frontend && pnpm exec vitest run 'app/[locale]/(main)/my-tickets/__tests__/PlaceAutocompleteInput.test.tsx' 'app/[locale]/(main)/my-tickets/place-autocomplete.func.test.ts'`
- [x] 필요 시 `cd frontend && pnpm test:unit -- app/api`

### 백엔드

- [x] `cd backend && JAVA_HOME=/opt/homebrew/opt/openjdk@17 GRADLE_USER_HOME=/private/tmp/perfo-gradle ./gradlew --no-daemon --console=plain test`

## 7. 진행 메모

이미 완료된 주요 분리:

- [x] `TicketService` 책임 분리
- [x] backend proxy helper 주요 적용
- [x] notifications service/repository 분리
- [x] auth flow helper 분리
- [x] scanner/my-tickets 분리
- [x] `PlaceAutocompleteInput` 분리
- [x] auth page 5개 controller hook 분리

이 문서 기준으로 남은 실질 작업은 아래다.

- [x] notifications page
- [x] reserved QR detail page
- [x] profile page
- [x] auth route 공통화
- [x] notifications / push route 정리
- [x] `TicketControllerTest.kt` 분리
