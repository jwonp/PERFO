# 인증 계정 전략

> 이 문서는 일반 회원가입, 소셜 로그인, 계정 연동/해제, 이메일 인증 정책을 다룬다.  
> 화면 구성은 `docs/01_Design/02_storyboard/03_storyboard.md`를 기준으로 하고, 구현 계획은 `docs/02_Development/00_Plan` 하위 문서에서 관리한다.

## 1. 설계 원칙

- 같은 이메일이라도 일반 계정과 소셜 계정을 자동으로 같은 사람으로 간주하지 않는다.
- 서비스 계정인 `User`와 로그인 수단인 `AuthIdentity`를 분리한다.
- 하나의 `User`는 여러 로그인 수단을 가질 수 있다.
- 로그인 수단 병합은 로그인된 사용자가 명시적으로 계정 연동을 완료한 경우에만 허용한다.
- 일반 로그인 이메일은 전역에서 유일하다.
- 소셜 provider 이메일은 로그인 식별자가 아니라 provider가 제공한 참고 정보로 저장한다.
- 계정 연동, 해제, 관리자 수동 처리는 감사 로그를 남긴다.

## 2. 용어

| 용어 | 의미 |
|------|------|
| `User` | PERFO 서비스에서 티켓, 예약, 프로필, 권한을 소유하는 계정 |
| `AuthIdentity` | `credentials`, `google`, `naver`, `line` 같은 로그인 수단 |
| 일반 계정 | 이메일과 비밀번호로 로그인하는 `credentials` identity |
| 소셜 계정 | OAuth provider의 provider user id로 로그인하는 identity |
| 메인 계정 | 계정 병합 시 데이터가 최종적으로 남는 `User` |
| 대표 이메일 | 사용자 프로필에 표시되는 `primary_email` |

## 3. 계정 생성 정책

### 3.1 일반 회원가입

- 일반 회원가입은 새 `User`와 `credentials` identity를 생성한다.
- `credentials` identity의 이메일은 전역에서 유일해야 한다.
- 비밀번호 설정과 이메일 인증을 모두 완료해야 일반 가입이 완료된다.
- 필수 프로필 입력값은 `displayName` 하나만 둔다.
- 약관 동의 정보는 `terms_version`, `privacy_version`, `marketing_opt_in`, `terms_agreed_at`을 저장한다.

### 3.2 소셜 최초 로그인

- 소셜 최초 로그인은 즉시 `User`를 만들지 않는다.
- OAuth 검증 후 10분 동안 유효한 임시 가입 상태를 만든다.
- 사용자가 약관 동의와 `displayName` 입력을 완료하면 새 `User`와 social identity를 생성한다.
- 같은 이메일의 일반 계정이 이미 있어도 자동 안내나 자동 병합 없이 별도 계정으로 진입한다.
- 같은 이메일의 다른 소셜 계정이 이미 있어도 별도 계정으로 본다.

### 3.3 대표 이메일

- 일반 계정이 연결된 `User`의 `primary_email`은 항상 `credentials` identity의 이메일을 사용한다.
- 일반 계정이 없는 경우에는 최초 소셜 identity의 이메일을 `primary_email`로 사용한다.
- 소셜 identity의 이메일은 provider 참고 정보이며 로그인 식별에 사용하지 않는다.

## 4. 계정 연동 정책

- 계정 연동은 반드시 로그인된 상태에서만 허용한다.
- 계정 연동 전에는 매번 재인증을 요구한다.
- 일반 계정 재인증은 비밀번호 재입력으로 처리한다.
- 소셜 계정 재인증은 OAuth 재로그인으로 처리한다.
- 재인증 후에도 마지막 단계에서 "연동하시겠습니까?" 확인을 거친다.
- 연동이 완료되면 어떤 로그인 수단으로 로그인해도 같은 `User`로 진입한다.
- 한 `User`는 provider별로 identity를 1개만 가질 수 있다.
- 이미 다른 `User`에 연결된 identity는 바로 이동할 수 없다. 기존 `User`에서 연동 해제한 뒤 다시 연동해야 한다.
- 연동 성공 시 보안 알림을 발송한다.

## 5. 계정 해제와 병합

- 사용자는 연결된 로그인 수단을 해제할 수 있다.
- 마지막 남은 로그인 수단은 해제할 수 없다.
- 소셜 identity를 해제한 뒤 같은 소셜 계정으로 다시 로그인하면 새 `User`를 만든다.
- 이전 연결 이력은 감사 로그에만 남기고 사용자에게 노출하지 않는다.
- 실수로 잘못 연동한 계정은 분리할 수 있어야 한다.
- 계정 병합 시 일반 계정이 있다면 일반 계정이 연결된 `User`를 메인 계정으로 삼는다.
- 병합 시 이전 대상은 티켓과 예약 데이터로 제한한다.
- MVP에서는 관리자 수동 병합/분리 화면을 만들지 않는다. 단, 감사 로그와 도메인 설계는 남긴다.

## 6. 권장 데이터 모델

### 6.1 users

```text
users
- id
- primary_email
- display_name
- profile_image_url
- role
- created_at
- updated_at
- deleted_at
```

`users`는 서비스 계정의 대표 프로필과 권한만 가진다. 로그인 식별자는 저장하지 않는다.

### 6.2 auth_identities

```text
auth_identities
- id
- user_id
- provider
- provider_user_id
- email
- password_hash
- email_verified_at
- terms_version
- privacy_version
- marketing_opt_in
- terms_agreed_at
- profile_completed_at
- last_login_at
- created_at
- updated_at
- unlinked_at
```

`provider`는 `credentials`, `google`, `naver`, `line` 중 하나로 시작한다. 일반 로그인도 `provider = credentials`인 identity로 모델링한다.

권장 제약 조건:

```text
unique lower(email) where provider = 'credentials' and unlinked_at is null
unique (provider, provider_user_id) where provider != 'credentials' and unlinked_at is null
unique (user_id, provider) where unlinked_at is null
```

### 6.3 pending_oauth_signups

```text
pending_oauth_signups
- id
- signup_token_hash
- provider
- provider_user_id
- email
- display_name
- profile_image_url
- expires_at
- created_at
```

소셜 최초 로그인 후 약관 동의와 프로필 입력이 끝나기 전의 임시 상태를 저장한다. 만료 시간은 10분이다.

### 6.4 email_verifications

```text
email_verifications
- id
- email
- purpose
- code_hash
- expires_at
- resend_available_at
- attempt_count
- verified_at
- created_at
```

이메일 인증 코드는 6자리 숫자를 사용한다. 만료 시간은 10분, 재전송 제한은 60초, 검증 시도 제한은 5회다.

`purpose`는 최소 아래 값을 둔다.

```text
signup
add_credentials
reset_password
```

### 6.5 account_audit_logs

```text
account_audit_logs
- id
- actor_type
- actor_id
- target_user_id
- action
- before_snapshot
- after_snapshot
- reason
- ip_address
- user_agent
- created_at
```

`actor_type`은 `user`, `admin`, `system`을 둔다. 관리자 수동 처리 시에는 매 수정마다 관리자 재인증을 요구하고, `reason`, 변경 전후 snapshot, 요청 환경 정보를 남긴다.

## 7. 로그인 UX 정책

- 이메일 입력 후 `다음`은 일반 로그인 계정만 조회한다.
- 같은 이메일의 소셜 계정이 있어도 `credentials` identity가 없으면 가입되지 않은 이메일로 본다.
- 소셜 로그인 버튼은 항상 노출한다.
- 소셜 로그인 후 같은 이메일의 일반 계정이 있어도 별도 계정으로 진입한다.
- 대표 프로필 이름과 이미지는 사용자가 직접 수정한 값을 우선한다.
- 사용자가 직접 수정한 값이 없을 때만 마지막 로그인 provider의 이름과 이미지를 반영할 수 있다.

## 8. 메일 발송 전략

### 8.1 기본 provider

- 인증 메일 발송은 Resend를 기본 provider로 사용한다.
- 개발과 운영은 Resend API key와 발신 도메인을 분리한다.
- 애플리케이션 코드는 `MailSender` 인터페이스 뒤에 provider 구현을 숨긴다.
- 초기 구현체는 `ResendMailSender`만 둔다.

예상 환경 변수:

```text
MAIL_PROVIDER=resend
RESEND_API_KEY=...
MAIL_FROM=no-reply@perfo.example
MAIL_REPLY_TO=support@perfo.example
```

### 8.2 운영 전제

- 운영 발송 전 Resend에서 발신 도메인 인증을 완료한다.
- DNS에는 SPF, DKIM, DMARC 설정을 반영한다.
- 인증 메일은 트랜잭션 메일로 분류하고 마케팅 수신 동의와 분리한다.

### 8.3 AWS SES 마이그레이션 경로

- `MailSender` 인터페이스는 유지하고 `SesMailSender` 구현체를 추가한다.
- SES에서 동일 발신 도메인을 인증하고 SPF, DKIM, DMARC 상태를 확인한다.
- sandbox 해제, 발송 한도, bounce/complaint 처리 정책을 준비한다.
- `MAIL_PROVIDER=ses` 전환으로 발송 provider를 교체한다.
- 전환 전후로 인증 메일 발송 성공률, bounce, complaint 지표를 비교한다.

## 9. 백엔드 처리 흐름

### 9.1 일반 회원가입

1. 이메일 중복을 `credentials` identity 기준으로 확인한다.
2. 이메일 인증 코드를 발송한다.
3. 인증 코드 검증이 완료되면 비밀번호와 `displayName`, 약관 동의 정보를 받는다.
4. 새 `User`와 `credentials` identity를 생성한다.
5. `primary_email`은 credentials 이메일로 설정한다.

### 9.2 소셜 최초 가입

1. OAuth provider에서 provider user id와 이메일을 검증한다.
2. 기존 social identity가 있으면 해당 `User`로 로그인한다.
3. 기존 social identity가 없으면 10분짜리 `pending_oauth_signup`을 만든다.
4. 사용자가 약관 동의와 `displayName` 입력을 완료한다.
5. 새 `User`와 social identity를 생성한다.
6. 일반 계정이 없으므로 `primary_email`은 소셜 이메일로 설정한다.

### 9.3 계정 연동

1. 로그인 상태를 확인한다.
2. 매번 현재 계정 재인증을 요구한다.
3. 추가할 identity의 인증을 완료한다.
4. 이미 다른 `User`에 연결된 identity인지 확인한다.
5. 사용자에게 최종 연동 확인을 받는다.
6. 현재 `User`에 identity를 추가한다.
7. 보안 알림을 발송하고 감사 로그를 남긴다.

### 9.4 계정 해제

1. 로그인 상태와 재인증을 확인한다.
2. 현재 `User`에 활성 identity가 2개 이상인지 확인한다.
3. 대상 identity를 `unlinked_at`으로 비활성화한다.
4. 대표 이메일 재계산이 필요하면 적용한다.
5. 보안 알림을 발송하고 감사 로그를 남긴다.

## 10. MVP 범위

MVP에 포함한다.

- 일반 회원가입/로그인
- 이메일 인증
- Resend 기반 메일 발송
- 소셜 최초 로그인 후 약관/프로필 입력
- provider별 1개 identity 연결
- 계정 연동/해제
- 최소 감사 로그 기록

MVP에서 제외한다.

- 관리자 수동 병합/분리 화면
- 고객센터 운영 도구
- AWS SES 전환 구현체
- 복잡한 계정 분리 UI
