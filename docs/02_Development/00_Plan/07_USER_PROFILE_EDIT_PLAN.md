# 유저 프로필 닉네임과 아이콘 변경 구현 계획

> 기준 문서:
> `docs/01_Design/00_Architecture/02_AUTH_ACCOUNT_STRATEGY.md`
> `docs/02_Development/00_Plan/01_FRONTEND_PLAN.md`
> `docs/03_Design System/01_foundations.md`
> `docs/03_Design System/04_frontend-code-rules.md`
> `docs/02_Development/00_Plan/10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md`
>
> 이 문서는 사용자가 프로필 화면에서 닉네임과 프로필 아이콘을 변경할 수 있게 만드는 작업 계획이다.

## 1. 목표

- 사용자가 프로필 화면에서 닉네임을 수정할 수 있다.
- 사용자가 기본 아이콘 또는 업로드한 이미지를 프로필 아이콘으로 설정할 수 있다.
- 변경된 프로필 정보는 새로고침, 재로그인 후에도 유지된다.
- 프로필 변경 후 화면의 세션 표시 값이 즉시 갱신된다.
- 닉네임과 이미지 입력은 서버에서 검증한다.
- 소셜 로그인 provider가 내려준 이름/이미지보다 사용자가 직접 수정한 프로필 값을 우선한다.

## 2. 현재 상태

- 백엔드 `User` 엔티티에는 `name`, `profileImage` 필드가 있다.
- `AuthDto.AuthResponse`도 `name`, `profileImage`를 반환한다.
- `AuthService`는 회원가입과 OAuth 로그인 시 초기 이름과 이미지를 저장한다.
- 프로필 화면은 `session.user.name`, `session.user.image`를 표시한다.
- 프로필 화면에는 연필 아이콘 버튼이 있지만 실제 수정 동작은 없다.
- 현재 사용자 프로필 조회/수정 전용 API는 없다.

## 3. 핵심 원칙

- 프로필은 인증 수단이 아니라 서비스 사용자 정보다.
  - 로그인 provider의 이름과 이미지는 초기값으로만 사용한다.
- 사용자가 직접 수정한 닉네임과 아이콘은 OAuth 재로그인으로 덮어쓰지 않는다.
- 닉네임은 표시용 값이므로 중복 허용을 기본값으로 둔다.
  - 유니크 닉네임 정책이 필요하면 별도 기획으로 분리한다.
- 이미지 업로드는 반드시 서버에서 파일 형식, 크기, 확장자, 실제 MIME을 검증한다.
- 클라이언트에서 crop/preview를 하더라도 서버 검증을 생략하지 않는다.
- 프로필 수정은 로그인된 사용자 본인에게만 허용한다.
- 변경 이력은 민감하지 않은 범위에서 감사 로그 또는 `updated_at`으로 추적한다.

## 4. UX 계획

### 4.1 진입

대상 화면:

- `frontend/app/[locale]/(main)/profile/page.tsx`

진입 방식:

- 프로필 이미지 오른쪽 아래의 연필 버튼을 누르면 프로필 편집 bottom sheet 또는 전용 화면을 연다.

권장 초기안:

- 모바일 중심 앱이므로 bottom sheet로 시작한다.
- 이후 설정 항목이 늘어나면 `/profile/edit` 전용 화면으로 분리한다.

### 4.2 편집 UI

필드:

- 프로필 아이콘
- 닉네임

프로필 아이콘 변경 옵션:

- 현재 이미지 유지
- 기본 아이콘 선택
- 이미지 업로드
- 이미지 제거 후 기본 아이콘으로 되돌리기

닉네임 입력:

- 현재 닉네임 표시
- 입력 중 글자 수 표시
- 저장 버튼은 값이 유효하고 변경된 경우에만 활성화

상태:

- 저장 중
- 저장 성공
- 유효성 오류
- 업로드 실패
- 네트워크 오류

### 4.3 기본 아이콘

초기 구현에서는 업로드만 의존하지 않고 기본 아이콘 세트를 제공한다.

이유:

- 사용자가 파일 권한을 주지 않아도 변경 경험을 제공할 수 있다.
- 이미지 저장소 구현 전에도 완성도 있는 MVP가 가능하다.
- 부적절한 이미지 업로드 리스크를 줄일 수 있다.

권장 기본 아이콘:

- 색상 토큰 기반 원형 아바타
- 이니셜 기반 아바타
- 6-12개의 preset avatar key

예시 값:

```text
avatar-blue
avatar-green
avatar-coral
avatar-violet
avatar-slate
avatar-gold
```

서버에는 URL만 저장하기보다 `profileImageType`과 `profileImageValue`를 분리하는 것을 권장한다.

## 5. 데이터 모델 계획

현재 단순 모델:

```text
users
- name
- profile_image
```

권장 확장 모델:

```text
users
- display_name
- profile_image_type
- profile_image_value
- profile_updated_at
```

`profile_image_type` 후보:

- `NONE`: 기본 아이콘
- `PRESET`: 앱 내 기본 아이콘 key
- `UPLOADED`: 사용자가 업로드한 이미지 URL 또는 object key
- `PROVIDER`: OAuth provider에서 받은 이미지

MVP에서는 기존 `name`, `profileImage`를 유지하고 다음 규칙을 적용할 수 있다.

- `name`: 표시 닉네임
- `profileImage`: preset key 또는 이미지 URL

단, 장기적으로는 preset key와 URL을 구분할 수 있도록 필드를 분리하는 편이 안전하다.

## 6. 백엔드 작업 계획

### 6.1 API 계약

내 프로필 조회:

```http
GET /api/users/me
```

응답:

```json
{
    "id": 1,
    "email": "user@example.com",
    "displayName": "PERFO User",
    "profileImageType": "PRESET",
    "profileImageValue": "avatar-blue"
}
```

내 프로필 수정:

```http
PATCH /api/users/me/profile
Content-Type: application/json
```

요청:

```json
{
    "displayName": "새 닉네임",
    "profileImageType": "PRESET",
    "profileImageValue": "avatar-green"
}
```

응답:

```json
{
    "id": 1,
    "email": "user@example.com",
    "displayName": "새 닉네임",
    "profileImageType": "PRESET",
    "profileImageValue": "avatar-green",
    "updatedAt": "2026-04-28T12:00:00+09:00"
}
```

이미지 업로드 API:

```http
POST /api/users/me/profile-image
Content-Type: multipart/form-data
```

응답:

```json
{
    "profileImageType": "UPLOADED",
    "profileImageValue": "https://cdn.perfo.app/profile-images/user-1/avatar.webp"
}
```

### 6.2 닉네임 검증

서버 검증 기준:

- trim 후 2자 이상
- 최대 20자
- 앞뒤 공백 제거
- 제어 문자 금지
- 줄바꿈 금지
- HTML 태그는 텍스트로만 저장하고 렌더링 시 escape
- 욕설/금칙어 필터는 MVP 이후 보류 가능

정책:

- 닉네임 중복은 허용한다.
- 빈 값은 허용하지 않는다.
- 이메일 주소 형태를 닉네임으로 쓰는 것은 권장하지 않지만 MVP에서는 차단하지 않는다.

### 6.3 이미지 검증

업로드 허용:

- `image/jpeg`
- `image/png`
- `image/webp`

제한:

- 최대 2MB
- 정사각형 crop은 클라이언트에서 유도하되 서버는 비율을 강제하지 않는다.
- 서버에서 리사이즈와 WebP 변환을 적용하는 것이 이상적이다.
- SVG 업로드는 허용하지 않는다.
  - 스크립트 삽입과 XSS 위험 때문이다.

저장:

- 로컬 파일 시스템 저장은 개발용으로만 허용한다.
- 운영은 S3 호환 object storage 또는 CDN 연동을 전제로 한다.
- 현재 프로젝트의 1차 object storage 구현은 [10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md](./10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md)를 따른다.
- DB에는 원본 파일명이 아니라 object key 또는 안전한 URL만 저장한다.

### 6.4 권한과 보안

- `GET /api/users/me`, `PATCH /api/users/me/profile`, `POST /api/users/me/profile-image`는 인증 필수다.
- 요청 path에 userId를 받지 않는다.
  - 현재 로그인 사용자 기준으로만 처리한다.
- 다른 사용자의 프로필을 수정할 수 없어야 한다.
- 업로드 파일명은 신뢰하지 않는다.
- 응답 에러는 사용자 친화적으로 제공하되 내부 저장 경로나 stack trace를 노출하지 않는다.
- profile image URL이 외부 URL일 경우 허용 도메인 정책을 둔다.
  - provider 이미지 URL 또는 자체 CDN만 허용한다.

## 7. 프론트엔드 작업 계획

### 7.1 컴포넌트 구조

후보 파일:

- `frontend/components/profile/ProfileEditSheet.tsx`
- `frontend/components/profile/profile-edit-sheet.types.ts`
- `frontend/components/profile/ProfileAvatarPicker.tsx`
- `frontend/components/profile/profile-avatar.constants.ts`

책임:

- `ProfileEditSheet`
  - 닉네임 입력
  - 현재/선택 프로필 이미지 preview
  - 저장 버튼
  - 에러 표시
- `ProfileAvatarPicker`
  - 기본 아이콘 목록 표시
  - 업로드 버튼
  - 선택 상태 표시

### 7.2 프로필 화면 연결

대상 파일:

- `frontend/app/[locale]/(main)/profile/page.tsx`

변경:

- 연필 버튼 클릭 시 편집 sheet open
- 저장 성공 후 화면의 `displayName`, `profileImage` 즉시 갱신
- NextAuth session 값도 갱신하거나, 화면 상태를 서버 응답으로 override

주의:

- `session.user.name`만 의존하면 저장 성공 후 세션이 stale할 수 있다.
- 저장 성공 응답을 로컬 화면 상태에 반영하고, 장기적으로는 session refresh 방식을 정한다.

### 7.3 API 클라이언트

후보 파일:

- `frontend/lib/profile/profile-client.ts`
- `frontend/lib/profile/profile.types.ts`

함수:

- `getMyProfile()`
- `updateMyProfile(payload)`
- `uploadProfileImage(file)`

상태 처리:

- loading
- validation error
- unauthorized
- upload failure
- retry

### 7.4 다국어 메시지

대상 파일:

- `frontend/messages/ko.json`
- `frontend/messages/en.json`
- `frontend/messages/ja.json`

필요 키:

- `profile.editProfile`
- `profile.nickname`
- `profile.nicknamePlaceholder`
- `profile.profileIcon`
- `profile.chooseDefaultIcon`
- `profile.uploadImage`
- `profile.removeImage`
- `profile.saveProfile`
- `profile.profileSaved`
- `profile.nicknameTooShort`
- `profile.nicknameTooLong`
- `profile.unsupportedImageType`
- `profile.imageTooLarge`

## 8. 세션 동기화 계획

프로필 수정 후 UI 반영 방식은 세 단계로 나눌 수 있다.

### 8.1 MVP

- 저장 성공 응답을 프로필 화면 로컬 상태에 반영한다.
- 현재 화면에서는 즉시 바뀐다.
- 새로고침 후에는 서버/세션 재조회로 반영한다.

### 8.2 권장

- `GET /api/users/me`를 프로필 화면 진입 시 호출한다.
- NextAuth session은 인증 식별용으로 사용하고, 표시 프로필은 사용자 API 응답을 기준으로 한다.

### 8.3 이후 확장

- NextAuth session callback 또는 `session.update()`를 사용해 세션의 `name`, `image`를 갱신한다.
- 여러 탭에서 프로필 변경 시 broadcast channel로 동기화한다.

## 9. 테스트 계획

### 9.1 백엔드 단위 테스트

- 유효한 닉네임으로 프로필 수정 성공
- 너무 짧은 닉네임 거부
- 너무 긴 닉네임 거부
- 공백만 있는 닉네임 거부
- 인증 없는 요청 거부
- 다른 사용자 프로필 수정 불가
- preset key가 허용 목록에 없으면 거부

### 9.2 백엔드 통합 테스트

- `PATCH /api/users/me/profile` 호출 후 DB의 `name`, `profileImage`가 변경된다.
- OAuth 재로그인 시 사용자가 직접 수정한 프로필이 덮어써지지 않는다.
- 이미지 업로드가 허용 MIME과 크기 제한을 지킨다.
- 잘못된 파일 형식은 400으로 실패한다.

### 9.3 프론트엔드 단위 테스트

- 프로필 편집 sheet가 열린다.
- 닉네임 입력 validation 메시지가 표시된다.
- 기본 아이콘을 선택하면 preview가 바뀐다.
- 저장 성공 후 프로필 화면의 이름과 아이콘이 바뀐다.
- API 실패 시 에러 메시지가 표시된다.

### 9.4 E2E 테스트

- `/ko/profile` 진입
- 연필 버튼 클릭
- 닉네임 수정
- 기본 아이콘 선택
- 저장
- 프로필 화면에서 변경된 닉네임과 아이콘 확인
- 새로고침 후에도 변경 값 유지 확인

## 10. 구현 순서

1. 프로필 API 계약과 DTO를 정의한다.
2. 백엔드 `GET /api/users/me`, `PATCH /api/users/me/profile` 테스트를 작성한다.
3. 백엔드 프로필 조회/수정 API를 구현한다.
4. 기본 아이콘 preset key 정책을 정의한다.
5. 프론트 프로필 API 클라이언트를 만든다.
6. `ProfileEditSheet`와 `ProfileAvatarPicker`를 만든다.
7. 프로필 화면의 연필 버튼에 편집 flow를 연결한다.
8. 저장 성공 후 화면 상태와 세션 표시 값을 동기화한다.
9. 이미지 업로드 API를 추가한다.
10. 업로드 파일 검증과 저장소 연결을 구현한다.
11. 단위 테스트와 E2E 테스트를 추가한다.

## 11. 완료 기준

- 사용자가 닉네임을 수정할 수 있다.
- 사용자가 기본 프로필 아이콘을 선택할 수 있다.
- 사용자가 이미지 업로드로 프로필 아이콘을 바꿀 수 있다.
- 잘못된 닉네임과 이미지 파일은 저장되지 않는다.
- 저장 성공 후 프로필 화면에 변경 값이 즉시 반영된다.
- 새로고침 후에도 변경 값이 유지된다.
- OAuth 재로그인으로 사용자가 직접 수정한 프로필이 덮어써지지 않는다.
- 인증된 사용자만 본인 프로필을 수정할 수 있다.

## 12. 보류 가능 항목

- 닉네임 유니크 정책
- 금칙어/욕설 필터
- 이미지 crop 편집기
- 여러 기기 간 실시간 프로필 동기화
- 관리자 프로필 수정 기능
- 프로필 변경 이력 화면

초기 구현은 본인 닉네임 수정, 기본 아이콘 선택, 안전한 이미지 업로드, 화면 반영을 완료 기준으로 삼는다.
