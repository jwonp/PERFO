# 인증 TDD 테스트 케이스와 컨벤션

> 기준 설계: `docs/01_Design/00_Architecture/02_AUTH_ACCOUNT_STRATEGY.md`  
> 이 문서는 로그인, 일반 회원가입, 소셜 최초 가입, 계정 연동/해제 구현 전에 작성할 테스트 케이스와 테스트 작성 규칙을 정의한다.

## 1. 현재 테스트 환경

### 1.1 Frontend

| 항목 | 현재 값 |
|------|---------|
| 테스트 러너 | `vitest` |
| React 테스트 | `@testing-library/react` |
| 사용자 이벤트 | `@testing-library/user-event` |
| DOM 매처 | `@testing-library/jest-dom` |
| 브라우저 환경 | `jsdom` |
| E2E | `@playwright/test` |
| 설정 파일 | `frontend/vitest.config.ts`, `frontend/vitest.setup.ts` |
| 단위 테스트 위치 | `**/__tests__/**/*.test.tsx`, `**/*.test.tsx` |
| E2E 제외 패턴 | `**/*.e2e.{ts,tsx}`, `**/*.spec.{ts,tsx}` |

실행 명령:

```bash
cd frontend
pnpm test:unit
pnpm test:watch
pnpm test:coverage
pnpm test:e2e
```

### 1.2 Backend

| 항목 | 현재 값 |
|------|---------|
| 언어 | Kotlin |
| 테스트 러너 | JUnit 5 |
| Mock | Mockito |
| Assertion | AssertJ |
| Web slice | MockMvc, `@WebMvcTest` |
| Security test | `spring-security-test` |
| Integration DB | H2 |
| 테스트 리소스 | `backend/src/test/resources/application-test.properties` |
| 테스트 위치 | `backend/src/test/kotlin/com/perfo/backend/**` |

실행 명령:

```bash
cd backend
./gradlew test
./gradlew test --tests "com.perfo.backend.service.AuthServiceTest"
./gradlew test --tests "*.AuthServiceTest.signUp_success"
```

## 2. TDD 진행 순서

인증 기능은 아래 순서로 실패 테스트를 먼저 작성한다.

1. 순수 규칙 테스트를 먼저 작성한다.
2. Service 단위 테스트로 도메인 분기와 저장 규칙을 고정한다.
3. Controller slice 테스트로 요청/응답 DTO와 validation을 고정한다.
4. Repository 또는 integration 테스트로 unique 제약과 트랜잭션 결과를 검증한다.
5. Frontend component 테스트로 입력, validation, 분기 UI를 고정한다.
6. Playwright E2E로 핵심 사용자 흐름만 고정한다.

## 3. 테스트 파일 컨벤션

### 3.1 Backend

| 테스트 종류 | 위치 | 이름 |
|-------------|------|------|
| Service unit | `backend/src/test/kotlin/com/perfo/backend/service` | `{Target}Test.kt` |
| Controller slice | `backend/src/test/kotlin/com/perfo/backend/controller` | `{Target}Test.kt` |
| Repository/Data JPA | `backend/src/test/kotlin/com/perfo/backend/repository` | `{Target}RepositoryTest.kt` |
| Integration | `backend/src/test/kotlin/com/perfo/backend/integration` | `{Flow}IntegrationTest.kt` |

Backend 테스트 메서드명은 영어 lower camel case를 사용한다.

```kotlin
fun signUp_withVerifiedEmail_createsUserAndCredentialsIdentity()
fun login_withSocialOnlyEmail_returnsNotFoundForCredentials()
```

`@DisplayName`은 한국어로 작성하고 `[대상] - [조건] - [결과]` 형식을 사용한다.

```kotlin
@DisplayName("일반 회원가입 - 인증된 이메일과 유효한 비밀번호 - User와 credentials identity를 생성한다")
```

### 3.2 Frontend

| 테스트 종류 | 위치 | 이름 |
|-------------|------|------|
| Component unit | 대상 컴포넌트 옆 `__tests__` | `{Component}.test.tsx` |
| Hook unit | hook 폴더의 `__tests__` | `{hookName}.test.ts` |
| Utility unit | util 폴더의 `__tests__` | `{module}.test.ts` |
| E2E | `frontend/e2e` | `{flow}.spec.ts` |

Frontend 테스트명은 사용자가 보는 동작을 한국어로 쓴다.

```typescript
it('가입되지 않은 이메일이면 회원가입 화면으로 이동한다', async () => {})
it('비밀번호 조건을 모두 만족해야 회원가입 버튼이 활성화된다', async () => {})
```

## 4. 공통 작성 규칙

- 테스트는 `given`, `when`, `then` 구획을 명시한다.
- 테스트 1개는 동작 1개만 검증한다.
- 성공 케이스보다 실패, 중복, 만료, 권한 없음 케이스를 먼저 고정한다.
- 외부 provider는 실제 호출하지 않고 adapter/interface를 mock 처리한다.
- 비밀번호, 인증 코드, 토큰은 원문 저장을 검증하지 않는다. hash 또는 masked 값 저장을 검증한다.
- 시간 의존 로직은 clock을 주입하거나 고정 가능한 time provider를 사용한다.
- 테스트 데이터 이메일은 `@example.com` 도메인을 사용한다.
- 소셜 provider id는 `google-user-1`, `naver-user-1`, `line-user-1`처럼 provider가 드러나게 만든다.
- Controller 테스트는 HTTP status, response body, validation error를 검증한다.
- Service 테스트는 repository 호출 여부와 도메인 결과를 검증한다.
- E2E 테스트는 실제 사용자가 보는 핵심 흐름만 검증하고 내부 구현 세부사항을 검증하지 않는다.

## 5. Backend TDD 케이스

### 5.1 일반 회원가입

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 일반 회원가입 - 인증된 이메일, 유효한 비밀번호, displayName, 약관 동의 - `User`와 `credentials` identity를 생성한다 | Service |
| P0 | 일반 회원가입 - 이미 존재하는 credentials 이메일 - 409 충돌을 반환한다 | Service, Controller |
| P0 | 일반 회원가입 - 이메일 인증이 완료되지 않음 - 가입을 거절한다 | Service |
| P0 | 일반 회원가입 - 약관 버전 누락 - 400을 반환한다 | Controller |
| P0 | 일반 회원가입 - privacy version 누락 - 400을 반환한다 | Controller |
| P0 | 일반 회원가입 - displayName 누락 또는 blank - 400을 반환한다 | Controller |
| P0 | 일반 회원가입 - 비밀번호 규칙 미달 - 400을 반환한다 | Controller |
| P1 | 일반 회원가입 - 이메일 대소문자 차이 - 같은 credentials 이메일로 판단한다 | Service, Repository |
| P1 | 일반 회원가입 - 비밀번호 저장 - 원문이 아닌 hash를 저장한다 | Service |
| P1 | 일반 회원가입 - marketing opt-in false - 가입을 허용하고 false를 저장한다 | Service |

기대 저장 결과:

```text
users.primary_email = credentials email
users.display_name = request.displayName
auth_identities.provider = credentials
auth_identities.email = credentials email
auth_identities.password_hash != raw password
auth_identities.email_verified_at != null
auth_identities.terms_version != null
auth_identities.privacy_version != null
auth_identities.terms_agreed_at != null
```

### 5.2 일반 로그인

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 일반 로그인 - credentials 이메일과 올바른 비밀번호 - JWT와 사용자 정보를 반환한다 | Service, Controller |
| P0 | 일반 로그인 - 같은 이메일의 소셜 identity만 존재 - 가입되지 않은 일반 이메일로 처리한다 | Service |
| P0 | 일반 로그인 - 비밀번호 불일치 - 인증 실패를 반환한다 | Service, Controller |
| P0 | 일반 로그인 - 해제된 credentials identity - 로그인 실패를 반환한다 | Service |
| P1 | 일반 로그인 - 성공 시 `last_login_at`을 갱신한다 | Service |
| P1 | 일반 로그인 - 이메일 대소문자 차이 - credentials identity를 찾는다 | Service |

### 5.3 이메일 중복 확인

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 이메일 확인 - credentials identity 존재 - `exists=true`를 반환한다 | Service, Controller |
| P0 | 이메일 확인 - 같은 이메일의 소셜 identity만 존재 - `exists=false`를 반환한다 | Service |
| P0 | 이메일 확인 - 이메일 형식 오류 - 400을 반환한다 | Controller |
| P1 | 이메일 확인 - 해제된 credentials identity만 존재 - `exists=false`를 반환한다 | Service |

### 5.4 이메일 인증

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 인증 코드 발송 - 유효한 이메일 - 6자리 코드를 생성하고 Resend 발송 adapter를 호출한다 | Service |
| P0 | 인증 코드 발송 - 60초 이내 재발송 - 거절한다 | Service |
| P0 | 인증 코드 검증 - 올바른 코드와 10분 이내 - verified 상태로 변경한다 | Service |
| P0 | 인증 코드 검증 - 만료된 코드 - 실패한다 | Service |
| P0 | 인증 코드 검증 - 5회 초과 실패 - 추가 시도를 차단한다 | Service |
| P1 | 인증 코드 저장 - 원문 코드가 아닌 hash를 저장한다 | Service |
| P1 | 인증 코드 발송 실패 - 가입 상태를 만들지 않는다 | Service |

### 5.5 소셜 최초 가입

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 소셜 로그인 - 기존 social identity 존재 - 해당 `User`로 로그인한다 | Service |
| P0 | 소셜 로그인 - 기존 social identity 없음 - `pending_oauth_signup`을 만들고 가입 완료 필요 상태를 반환한다 | Service, Controller |
| P0 | 소셜 최초 가입 완료 - 10분 이내 pending token, 약관 동의, displayName 입력 - 새 `User`와 social identity를 생성한다 | Service |
| P0 | 소셜 최초 가입 완료 - pending token 만료 - 가입을 거절한다 | Service |
| P0 | 소셜 최초 가입 완료 - 같은 이메일의 credentials identity 존재 - 자동 병합하지 않고 별도 `User`를 생성한다 | Service |
| P0 | 소셜 최초 가입 완료 - 같은 이메일의 다른 provider identity 존재 - 자동 병합하지 않고 별도 `User`를 생성한다 | Service |
| P1 | 소셜 최초 가입 완료 - 일반 계정이 없으므로 `primary_email`을 소셜 이메일로 설정한다 | Service |
| P1 | 소셜 최초 가입 완료 - provider별 `(provider, providerUserId)` unique를 보장한다 | Repository |

### 5.6 계정 연동

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 계정 연동 시작 - 로그인되지 않음 - 401을 반환한다 | Controller |
| P0 | 계정 연동 시작 - 재인증 없음 - 연동을 거절한다 | Service |
| P0 | 계정 연동 확인 - 재인증과 대상 identity 인증 완료, 최종 확인 true - 현재 `User`에 identity를 추가한다 | Service |
| P0 | 계정 연동 - 같은 provider가 이미 연결됨 - 충돌을 반환한다 | Service |
| P0 | 계정 연동 - 대상 identity가 다른 `User`에 연결됨 - 충돌을 반환한다 | Service |
| P1 | 계정 연동 성공 - 보안 알림과 감사 로그를 남긴다 | Service |
| P1 | 계정 연동 성공 - 일반 계정이 추가되면 `primary_email`을 credentials 이메일로 변경한다 | Service |

### 5.7 계정 해제

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 계정 해제 - 로그인되지 않음 - 401을 반환한다 | Controller |
| P0 | 계정 해제 - 재인증 없음 - 해제를 거절한다 | Service |
| P0 | 계정 해제 - 마지막 남은 identity - 해제를 거절한다 | Service |
| P0 | 계정 해제 - identity가 2개 이상 - 대상 identity를 `unlinked_at`으로 비활성화한다 | Service |
| P1 | 계정 해제 - credentials 해제 후 소셜만 남음 - `primary_email`을 활성 소셜 이메일로 재계산한다 | Service |
| P1 | 계정 해제 성공 - 보안 알림과 감사 로그를 남긴다 | Service |
| P1 | 해제된 소셜로 다시 로그인 - 새 `pending_oauth_signup`을 만든다 | Service |

### 5.8 감사 로그

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P1 | 계정 연동 성공 - `link_identity` 감사 로그를 저장한다 | Service |
| P1 | 계정 해제 성공 - `unlink_identity` 감사 로그를 저장한다 | Service |
| P1 | 관리자 수동 처리 - 관리자 재인증 없이는 실패한다 | Service |
| P2 | 관리자 수동 처리 - before/after snapshot, reason, ip, userAgent를 저장한다 | Service |

## 6. Frontend TDD 케이스

### 6.1 이메일 시작 화면

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 이메일 입력 전 `다음` 버튼은 비활성화된다 | Component |
| P0 | 잘못된 이메일 형식이면 오류 메시지를 표시한다 | Component |
| P0 | credentials 이메일이 존재하면 비밀번호 입력 화면으로 이동한다 | Component |
| P0 | 같은 이메일의 소셜 계정만 있어도 회원가입 화면으로 이동한다 | Component |
| P0 | 소셜 로그인 버튼은 이메일 입력 여부와 관계없이 항상 보인다 | Component |
| P1 | 이메일 확인 API 실패 시 재시도 가능한 오류 메시지를 표시한다 | Component |

### 6.2 일반 회원가입 화면

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 비밀번호가 8자 미만이면 `8자 이상` 조건이 실패 상태다 | Component |
| P0 | 영문이 없으면 `영문 포함` 조건이 실패 상태다 | Component |
| P0 | 숫자가 없으면 `숫자 포함` 조건이 실패 상태다 | Component |
| P0 | 특수문자가 없으면 `특수 문자 포함` 조건이 실패 상태다 | Component |
| P0 | 모든 비밀번호 조건과 displayName, 필수 약관이 충족되어야 회원가입 버튼이 활성화된다 | Component |
| P0 | 마케팅 수신 동의는 선택값이며 미동의 상태에서도 가입 버튼이 활성화된다 | Component |
| P0 | 회원가입 제출 전 이메일 인증이 필요하면 인증 화면으로 이동한다 | Component |
| P1 | 회원가입 실패 409 응답이면 이미 가입된 이메일 메시지를 표시한다 | Component |

### 6.3 이메일 인증 화면

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 6자리 숫자 입력 전 확인 버튼은 비활성화된다 | Component |
| P0 | 올바른 코드 검증 성공 시 다음 단계로 이동한다 | Component |
| P0 | 잘못된 코드면 오류 메시지를 표시한다 | Component |
| P0 | 재전송 버튼은 60초 동안 비활성화된다 | Component |
| P1 | 5회 실패 시 추가 시도를 막고 재발송 안내를 표시한다 | Component |

### 6.4 소셜 최초 가입 추가 입력

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 소셜 최초 로그인 후 pending 상태면 약관과 displayName 입력 화면을 표시한다 | Component |
| P0 | displayName과 필수 약관 동의 전 완료 버튼은 비활성화된다 | Component |
| P0 | 10분 만료 응답이면 다시 소셜 로그인을 안내한다 | Component |
| P0 | 완료 성공 시 메인 화면으로 이동한다 | Component |
| P1 | 소셜 provider의 이름이 있으면 displayName 초기값으로 보여준다 | Component |

### 6.5 계정 연동/해제 화면

| 우선순위 | 테스트 | 계층 |
|----------|--------|------|
| P0 | 현재 연결된 로그인 수단 목록을 표시한다 | Component |
| P0 | 연동 시작 시 재인증 화면을 먼저 표시한다 | Component |
| P0 | 재인증 성공 후 최종 확인 모달을 표시한다 | Component |
| P0 | 이미 연결된 provider는 추가 연동 버튼을 비활성화한다 | Component |
| P0 | 마지막 남은 로그인 수단의 해제 버튼은 비활성화된다 | Component |
| P1 | 연동 성공 시 보안 알림 발송 안내를 표시한다 | Component |
| P1 | 해제 성공 시 목록에서 해당 로그인 수단을 제거한다 | Component |

## 7. E2E TDD 케이스

E2E는 핵심 사용자 흐름만 작성한다. 세부 validation은 component와 service 테스트에서 처리한다.

| 우선순위 | 테스트 |
|----------|--------|
| P0 | 신규 사용자가 이메일 인증, 약관 동의, displayName 입력, 비밀번호 설정을 완료하고 일반 회원가입한다 |
| P0 | 일반 계정 사용자가 이메일과 비밀번호로 로그인한다 |
| P0 | 소셜 최초 로그인 사용자가 추가 가입 화면에서 약관과 displayName을 입력하고 가입을 완료한다 |
| P1 | 일반 계정 로그인 사용자가 Google 계정 연동을 시작하고 재인증, 최종 확인 후 연동을 완료한다 |
| P1 | 로그인 수단이 2개인 사용자가 소셜 연동을 해제한다 |

## 8. Mock/Adapter 컨벤션

### 8.1 Backend adapter

외부 의존성은 interface 뒤에 숨기고 service 테스트에서는 mock 처리한다.

```text
OAuthClient
MailSender
TokenIssuer
Clock 또는 TimeProvider
SecurityNotifier
AccountAuditLogger
```

### 8.2 Frontend mock

- `next-auth/react`는 테스트 파일에서 `vi.mock`으로 격리한다.
- `next-intl`은 번역 key를 그대로 반환하게 mock한다.
- API 호출은 fetch 또는 API client module 단위로 mock한다.
- 타이머가 있는 인증 코드 재전송 테스트는 fake timer를 사용한다.

## 9. 완료 기준

- 신규 인증 기능은 P0 테스트가 먼저 실패한 상태로 작성되어야 한다.
- 구현 후 P0 테스트가 모두 통과해야 다음 기능으로 넘어간다.
- 로그인/회원가입 변경은 backend service, backend controller, frontend component 테스트를 모두 포함해야 한다.
- 핵심 플로우가 바뀌면 Playwright E2E 테스트를 추가하거나 갱신해야 한다.
- 커밋 전 최소 `./gradlew test`와 `pnpm test:unit`을 실행한다.
