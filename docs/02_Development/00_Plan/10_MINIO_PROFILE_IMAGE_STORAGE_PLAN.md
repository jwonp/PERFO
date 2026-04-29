# MinIO 기반 프로필 이미지 저장소 도입 계획

> 기준 문서:
> `docs/02_Development/00_Plan/07_USER_PROFILE_EDIT_PLAN.md`
> `docs/02_Development/00_Plan/09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md`
> `docker-compose.yml`
>
> 이 문서는 유저 프로필 아이콘 이미지 업로드를 위해 MinIO를 도입하는 계획이다. 초기 구현은 브라우저가 MinIO에 직접 접근하는 presigned upload가 아니라, 백엔드가 파일을 받아 검증한 뒤 MinIO에 저장하는 구조를 기준으로 한다.

## 1. 목표

- 유저가 프로필 화면에서 이미지를 업로드해 프로필 아이콘으로 사용할 수 있다.
- 업로드 이미지는 백엔드에서 검증한 뒤 MinIO에 저장한다.
- DB에는 원본 파일명이나 외부 URL보다 안정적인 object key를 저장한다.
- 새로고침과 재로그인 후에도 프로필 이미지가 유지된다.
- 온프레미스 미니PC 단일 서버 환경에서 운영 가능한 저장, 백업, 제한 정책을 둔다.
- 추후 S3 호환 저장소 또는 CDN으로 전환할 수 있는 인터페이스를 유지한다.

## 2. 현재 상태

- `docker-compose.yml`에는 `postgres`, `redis`, `backend`, `frontend`, `kafka`, `zookeeper`가 있다.
- MinIO 서비스는 아직 없다.
- `backend/build.gradle`에는 MinIO Java SDK 의존성이 없다.
- `User` 엔티티에는 `profileImage` 필드가 있다.
- 프로필 이미지 업로드 API는 아직 없다.
- `07_USER_PROFILE_EDIT_PLAN.md`는 업로드 저장소를 S3 호환 object storage 전제로 두고 있다.

## 3. 도입 방향

초기 구현 방식:

```text
Browser
 -> Backend multipart upload API
 -> validation
 -> MinIO putObject
 -> DB profile image object key update
 -> Browser receives profileImageUrl
```

초기에는 백엔드 경유 업로드를 사용한다.

이유:

- 이미지 MIME, 크기, 확장자, 사용자 권한 검증을 서버에서 일관되게 처리할 수 있다.
- MinIO access key를 브라우저에 노출하지 않는다.
- 프로필 이미지는 최대 2MB 수준이므로 백엔드 경유 업로드 비용이 감당 가능하다.
- presigned upload는 트래픽 증가나 대용량 파일 업로드가 필요할 때 도입해도 된다.

## 4. Docker Compose 계획

`docker-compose.yml`에 MinIO 서비스를 추가한다.

```yaml
minio:
  image: quay.io/minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    MINIO_BROWSER_REDIRECT_URL: ${MINIO_BROWSER_REDIRECT_URL}
    MINIO_SERVER_URL: ${MINIO_SERVER_URL}
  ports:
    - "${MINIO_API_PORT:-9000}:9000"
    - "${MINIO_CONSOLE_PORT:-9001}:9001"
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 10s
    retries: 3
```

`volumes`에 추가:

```yaml
volumes:
  redis_data:
  postgres_data:
  minio_data:
```

주의:

- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`는 관리자 콘솔용이다.
- 애플리케이션은 별도 access key를 사용해야 한다.
- 운영에서는 기본 계정 `minioadmin:minioadmin`을 절대 사용하지 않는다.
- MinIO API와 Console을 외부에 공개할지 여부는 별도 네트워크 정책으로 정한다.

## 5. 환경 변수 계획

개발/운영 공통 후보:

```env
MINIO_ROOT_USER=perfo_minio_admin
MINIO_ROOT_PASSWORD=strong-random-admin-password
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_BASE_URL=https://assets.example.com
MINIO_ACCESS_KEY=perfo_app
MINIO_SECRET_KEY=strong-random-app-password
MINIO_REGION=ap-northeast-2
MINIO_BUCKET_PROFILE_IMAGES=profile-images

MINIO_BROWSER_REDIRECT_URL=https://minio-console.example.com
MINIO_SERVER_URL=https://minio-api.example.com
```

운영 원칙:

- root 계정은 콘솔 관리용으로만 사용한다.
- 앱 전용 access key는 최소 권한으로 만든다.
- `.env.prod`는 Git에 커밋하지 않는다.
- secret은 배포 서버에서만 관리한다.

## 6. 버킷 정책

버킷:

```text
profile-images
```

초기 정책:

- bucket은 기본 private로 둔다.
- 업로드는 백엔드만 수행한다.
- 조회 방식은 둘 중 하나를 선택한다.
  - 1안: 백엔드가 presigned GET URL을 발급한다.
  - 2안: 검증된 이미지에 한해 public read 또는 CDN read 경로를 둔다.

권장 초기안:

- object key는 DB에 저장한다.
- 프론트 표시용 URL은 백엔드 응답에서 조립하거나 presigned URL로 제공한다.
- 운영에서 CDN을 붙일 경우 `MINIO_PUBLIC_BASE_URL`만 바꿀 수 있게 한다.

## 7. Object Key 설계

원본 파일명을 object key에 사용하지 않는다.

권장:

```text
profile-images/{userId}/{uuid}.{ext}
```

예시:

```text
profile-images/1/7f1b5c0e-9e2b-4f50-a6de-1f9a8e42c001.webp
```

규칙:

- userId별 prefix를 둔다.
- 파일명은 UUID를 사용한다.
- 가능하면 서버에서 WebP로 변환한 뒤 `.webp`로 저장한다.
- MVP에서 변환을 하지 않는다면 실제 MIME에 맞는 확장자만 사용한다.
- DB에는 object key와 image type을 저장한다.

## 8. 백엔드 구현 계획

### 8.1 의존성

`backend/build.gradle`:

```gradle
implementation 'io.minio:minio:8.6.0'
```

### 8.2 설정

`backend/src/main/resources/application.yml`:

```yaml
app:
  storage:
    minio:
      endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
      access-key: ${MINIO_ACCESS_KEY:}
      secret-key: ${MINIO_SECRET_KEY:}
      region: ${MINIO_REGION:ap-northeast-2}
      bucket-profile-images: ${MINIO_BUCKET_PROFILE_IMAGES:profile-images}
      public-base-url: ${MINIO_PUBLIC_BASE_URL:}
```

후보 파일:

- `backend/src/main/kotlin/com/perfo/backend/config/MinioConfig.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/ProfileImageStorageService.kt`
- `backend/src/main/kotlin/com/perfo/backend/controller/UserProfileController.kt`
- `backend/src/main/kotlin/com/perfo/backend/dto/UserProfileDto.kt`

### 8.3 업로드 API

```http
POST /api/users/me/profile-image
Content-Type: multipart/form-data
```

요청:

```text
file: image/jpeg | image/png | image/webp
```

응답:

```json
{
    "profileImageType": "UPLOADED",
    "profileImageValue": "profile-images/1/uuid.webp",
    "profileImageUrl": "https://assets.example.com/profile-images/1/uuid.webp"
}
```

처리 순서:

1. 인증 사용자 확인
2. multipart file 존재 확인
3. 파일 크기 검증
4. MIME 검증
5. SVG 등 위험 형식 차단
6. object key 생성
7. MinIO에 업로드
8. 사용자 profile image 필드 갱신
9. 표시용 URL 또는 object key 반환

### 8.4 검증 기준

허용:

- `image/jpeg`
- `image/png`
- `image/webp`

거부:

- `image/svg+xml`
- `text/html`
- `application/octet-stream` 단독 신뢰
- 2MB 초과
- 빈 파일

추가 권장:

- 파일 확장자보다 실제 content type을 우선한다.
- 가능하면 magic byte 검사를 추가한다.
- EXIF metadata 제거를 검토한다.
- 이미지 리사이즈와 WebP 변환은 MVP 이후 단계로 분리 가능하다.

## 9. 프론트엔드 구현 계획

대상:

- `ProfileEditSheet`
- `ProfileAvatarPicker`
- `frontend/app/[locale]/(main)/profile/page.tsx`
- 프로필 API client

흐름:

1. 사용자가 이미지 파일 선택
2. 프론트에서 1차 크기/MIME 검사
3. preview 표시
4. `POST /api/users/me/profile-image` 호출
5. 성공 응답으로 화면 이미지 즉시 갱신
6. 실패 시 기존 이미지 유지와 오류 메시지 표시

프론트 검증:

- 최대 2MB
- jpeg/png/webp만 허용
- 업로드 중 중복 클릭 방지
- 실패 시 재시도 가능

주의:

- 프론트 검증은 UX용이다.
- 최종 검증은 반드시 백엔드에서 수행한다.

## 10. 운영과 백업

현재 서버는 온프레미스 미니PC이므로 MinIO도 같은 노드에서 시작한다.

운영 기준:

- `minio_data` volume은 백업 대상이다.
- PostgreSQL 백업과 MinIO 백업의 시점을 맞춘다.
- DB에는 object key가 있으므로 MinIO object가 유실되면 프로필 이미지 링크가 깨진다.
- 이미지 교체 후 이전 object 정리 정책이 필요하다.
- 디스크 사용률 80% 이상이면 알람을 낸다.

백업 우선순위:

```text
1. PostgreSQL
2. MinIO profile-images bucket
3. .env.prod / secrets
4. compose files
```

주의:

- 같은 16GB 미니PC에서 Kafka/Zookeeper까지 상시 구동하면 메모리 압박이 커진다.
- MinIO 도입 후에도 Kafka는 초기 필수 구성에서 제외하거나 피크 테스트로 필요성을 검증한다.

## 11. 보안 중요 사항

- MinIO root credential은 앱에서 사용하지 않는다.
- 업로드 API는 인증 필수다.
- path에 userId를 받지 않고 현재 인증 사용자 기준으로 처리한다.
- object key에 원본 파일명을 포함하지 않는다.
- 로그에 access key, secret key, presigned URL 전체를 남기지 않는다.
- SVG 업로드는 허용하지 않는다.
- 업로드 실패 시 내부 endpoint나 bucket 정보를 사용자에게 노출하지 않는다.
- public read를 허용할 경우 bucket 전체 공개보다 prefix/CDN 정책을 검토한다.

## 12. 테스트 계획

백엔드:

- 인증 사용자의 jpeg 업로드 성공
- png 업로드 성공
- webp 업로드 성공
- 2MB 초과 실패
- SVG 실패
- 빈 파일 실패
- 인증 없는 요청 실패
- 업로드 성공 후 사용자 profile image 값 갱신
- MinIO 장애 시 사용자 profile image 값이 변경되지 않음

프론트:

- 파일 선택 시 preview 표시
- 허용되지 않은 형식 선택 시 오류 표시
- 2MB 초과 선택 시 오류 표시
- 업로드 성공 후 프로필 이미지 즉시 변경
- 업로드 실패 시 기존 이미지 유지

E2E:

- 프로필 화면 진입
- 편집 sheet 열기
- 이미지 업로드
- 저장/반영 확인
- 새로고침 후 이미지 유지 확인

## 13. 구현 순서

1. `docker-compose.yml`에 MinIO 서비스와 `minio_data` volume을 추가한다.
2. `.env` 예시에 MinIO 환경 변수를 추가한다.
3. MinIO 컨테이너를 실행하고 healthcheck를 확인한다.
4. `profile-images` 버킷을 만든다.
5. 앱 전용 MinIO access key를 만든다.
6. 백엔드에 MinIO Java SDK 의존성을 추가한다.
7. `MinioConfig`와 storage service를 만든다.
8. 프로필 이미지 업로드 API를 만든다.
9. 파일 검증 로직을 만든다.
10. 업로드 성공 시 사용자 profile image 값을 갱신한다.
11. 프론트 프로필 편집 UI에 업로드를 연결한다.
12. 단위 테스트와 E2E 테스트를 추가한다.
13. MinIO 백업과 운영 절차를 문서화한다.

## 14. 완료 기준

- Docker Compose로 MinIO가 실행된다.
- `profile-images` 버킷이 준비된다.
- 백엔드가 MinIO에 프로필 이미지를 업로드할 수 있다.
- 허용 이미지 형식과 크기 제한이 서버에서 검증된다.
- 업로드 성공 후 사용자 프로필 이미지가 DB에 반영된다.
- 새로고침 후에도 업로드한 프로필 이미지가 표시된다.
- MinIO 장애 시 사용자에게 업로드 실패로 안내되고 DB 상태가 오염되지 않는다.
- MinIO data volume 백업 대상이 문서화되어 있다.

## 15. 이후 확장

- presigned PUT 기반 브라우저 직접 업로드
- 이미지 리사이즈와 WebP 변환
- EXIF 제거
- CDN 연동
- 오래된 프로필 이미지 object 정리 job
- 바이러스 스캔
- S3 managed storage 전환
