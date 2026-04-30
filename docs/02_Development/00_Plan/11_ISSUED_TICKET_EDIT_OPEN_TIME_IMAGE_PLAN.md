# 발급 티켓 상태 수정, 오픈 시간, 이미지 추가/수정 구현 계획

> 기준 문서:
> `docs/02_Development/00_Plan/04_TICKET_QR_VALIDATION_PLAN.md`
> `docs/02_Development/00_Plan/06_TICKET_NOTIFICATION_PLAN.md`
> `docs/02_Development/00_Plan/10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md`
> `frontend/app/[locale]/(main)/my-tickets/page.tsx`
> `backend/src/main/kotlin/com/perfo/backend/dto/TicketDto.kt`
> `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
>
> 이 문서는 운영자가 발급한 티켓에 대해 일반 수정, 상태 수정, 검표 오픈 시간 설정, 티켓 대표 이미지 추가/수정을 지원하기 위한 구현 계획이다.

## 1. 목표

- 운영자는 발급한 티켓의 기본 정보와 운영 상태를 앱에서 수정할 수 있다.
- 운영자는 티켓이 실제로 검표 가능해지는 오픈 시간을 설정할 수 있다.
- 운영자는 티켓 대표 이미지를 추가하거나 교체할 수 있다.
- 티켓 상태 전이는 수동 수정과 시간 기반 자동 전이를 함께 고려해 일관되게 처리한다.
- 이미지 저장은 현재 도입된 MinIO 기반 업로드 패턴을 재사용한다.
- 수정 결과는 새로고침 후에도 유지되어야 하며, 프론트 로컬 상태에만 머물지 않아야 한다.

## 2. 현재 상태

- `backend/src/main/kotlin/com/perfo/backend/dto/TicketDto.kt`의 `CreateTicketRequest`에는 `name`, `venue`, `validDate`, `totalCount` 등만 있고 `openAt`, `imageUrl`, `imageKey` 같은 필드가 없다.
- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`는 `create`, `findAllByOwnerUserId`, `updateIssuedStatus`만 제공한다.
- 운영자가 일반 수정에 사용할 `PATCH /api/tickets/{ticketId}` API가 없다.
- `frontend/app/[locale]/(main)/my-tickets/page.tsx`의 수정 동작은 현재 서버 호출 없이 클라이언트 상태만 바꾼다.
- 같은 화면의 생성 폼에도 이미지 업로드 입력과 오픈 시간 입력이 없다.
- `frontend/components/tickets/IssuedTicketCard.tsx`는 `ticket.imageUrl`이 있으면 이미지를 렌더링하지만, 실제 백엔드 응답에는 이미지 필드가 없다.
- 상태 전이는 `/api/internal/issued-tickets/{ticketId}/status`로만 노출되어 있어 운영자 일반 수정 화면에서 바로 쓰기 어렵다.
- MinIO와 업로드 서비스는 프로필 이미지 기준으로 이미 도입 방향이 정리되어 있어, 티켓 이미지 저장 전략을 새로 만들 필요는 없다.

## 3. 요구 범위 정리

이번 계획의 범위는 세 가지다.

1. 운영자 일반 수정
2. 운영 상태 수정과 오픈 시간 정책 추가
3. 티켓 대표 이미지 추가와 교체

초기 범위에서 제외한다.

- 여러 장의 갤러리 이미지
- 이미지 편집기, 크롭 UI, 필터 기능
- 대량 상태 변경
- 예약자용 상세 랜딩 페이지 공개
- CDN 최적화, 썸네일 변환 파이프라인

## 4. 핵심 결정

### 4.1 수정 API와 상태 API를 분리한다

- 일반 정보 수정은 `PATCH /api/tickets/{ticketId}`로 처리한다.
- 운영 상태 수정은 별도 필드로 함께 보낼 수 있지만, 서버 내부에서는 상태 전이 규칙을 독립 검증한다.
- 기존 `/api/internal/issued-tickets/{ticketId}/status`는 테스트나 내부 운영용으로 남기고, 실제 사용자 경로는 일반 수정 API로 수렴시키는 방향이 낫다.

이유:

- 운영자 화면은 한 번의 저장 액션으로 이름, 장소, 이미지, 오픈 시간을 함께 바꾸는 경우가 많다.
- 상태 전이 검증은 일반 필드 업데이트와 관심사가 다르므로 서비스 레벨에서는 분리하는 편이 안전하다.

### 4.2 오픈 시간은 날짜만이 아니라 시각까지 저장한다

- 현재 `validDate`만으로는 `언제부터 검표 가능한지`를 표현할 수 없다.
- 최소한 `openAt`은 `ISO-8601 datetime` 기준으로 저장한다.
- 필요하면 후속 단계에서 `closeAt` 또는 `expiresAt`을 추가한다.

권장 초기안:

- `openAt`: 검표 시작 시각
- `validDate`: 티켓 기준 날짜 표시용 필드로 유지

### 4.3 티켓 이미지는 object key를 저장한다

- DB나 응답에 외부 절대 URL만 저장하지 않는다.
- 프로필 이미지와 동일하게 MinIO object key를 기준으로 저장한다.
- 프론트 표시에 필요한 URL은 백엔드가 조립하거나 별도 조회 API에서 반환한다.

## 5. 상태 정책

### 5.1 발급 티켓 운영 상태

현재 상태:

- `INACTIVE`
- `ISSUING`
- `VERIFYING`
- `EXPIRED`

이 상태는 유지하되, 의미를 더 명확히 고정한다.

- `INACTIVE`: 생성되었지만 아직 공개 또는 운영 시작 전
- `ISSUING`: 예약/발급 진행 중
- `VERIFYING`: 현장 검표 진행 중
- `EXPIRED`: 종료되어 더 이상 운영하지 않음

### 5.2 오픈 시간과 상태의 관계

- `openAt` 이전에는 검표 화면 진입은 가능하더라도 실제 검표 요청은 `NOT_OPEN`을 반환해야 한다.
- `ISSUING` 상태라도 `openAt`이 미래이면 예약은 가능하지만 검표는 불가능하다.
- `VERIFYING`은 운영자가 강제로 검표 모드에 진입시킨 상태로 보되, `openAt` 이전 강제 전환은 서버 정책으로 막거나 경고해야 한다.

권장 규칙:

1. `INACTIVE -> ISSUING`은 허용
2. `ISSUING -> VERIFYING`은 `now >= openAt`일 때만 허용
3. `VERIFYING -> ISSUING`은 운영자 수동 되돌리기로 허용
4. `ANY -> EXPIRED`는 허용
5. `EXPIRED` 이후 일반 수정은 제한하고, 메타데이터 수정만 허용 여부를 별도로 정한다

### 5.3 자동 상태 전이

초기에는 완전 자동화보다 혼합 모델이 현실적이다.

- 운영자가 상태를 수동 변경할 수 있다.
- 서버는 `openAt` 기준 검표 가능 여부만 강제한다.
- 후속 단계에서 스케줄러가 `openAt` 도달 시 `ISSUING -> VERIFYING` 자동 전환하는 방식을 검토한다.

이 방식이 초기 구현에 유리한 이유:

- 크론, 배치, 스케줄러 없이도 도메인 일관성을 확보할 수 있다.
- 사용자는 먼저 오픈 시간에 따른 차단 효과를 얻을 수 있다.

## 6. 데이터 모델 변경 계획

### 6.1 백엔드 DTO

`backend/src/main/kotlin/com/perfo/backend/dto/TicketDto.kt`

추가 후보:

```kotlin
data class UpdateTicketRequest(
    @field:NotBlank
    val name: String,
    @field:NotBlank
    val venue: String,
    @field:Pattern(regexp = "^[A-Za-z0-9_-]{3,256}$")
    val googlePlaceId: String,
    val detailAddress: String?,
    @field:Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    val validDate: String,
    val openAt: String?,
    @field:Min(1)
    val totalCount: Int,
    val allowDuplicate: Boolean,
    @field:Min(1)
    @field:Max(100)
    val maxPerUser: Int,
    val status: IssuedTicketStatus?,
    val imageKey: String?,
)
```

`TicketResponse`에도 다음 필드를 추가한다.

- `openAt`
- `imageUrl`
- `imageKey`
- 필요하면 `canEditStatus`, `canScanNow` 같은 파생 필드

### 6.2 엔티티 또는 저장 모델

현재 백엔드 `Ticket` 엔티티는 예약자 발급 레코드 성격이 강하고, 운영자용 티켓 상품 정보는 `TicketService`의 메모리 DTO에 머물러 있다.

따라서 구현 전 선택이 필요하다.

1안. 운영자용 발급 티켓 모델을 별도 엔티티로 분리
- 예: `IssuedTicket`, `TicketProduct`, `ManagedTicket`

2안. 현재 `TicketResponse` 기반 메모리 저장소에 필드를 확장한 뒤, 이후 DB로 옮김

권장안:

- 이번 작업부터는 운영자용 티켓 정보를 DB 엔티티로 분리한다.

이유:

- 수정, 이미지, 오픈 시간은 휘발성 메모리 저장으로 감당할 수 있는 범위를 넘는다.
- 프로필 이미지와 마찬가지로 파일 key를 영속 저장해야 한다.
- 운영 상태와 예약/검표 상태를 분리하지 않으면 이후 조회와 권한 관리가 꼬인다.

후보 필드:

- `id`
- `ownerUserId`
- `name`
- `venue`
- `googlePlaceId`
- `detailAddress`
- `validDate`
- `openAt`
- `status`
- `totalCount`
- `allowDuplicate`
- `maxPerUser`
- `imageKey`
- `createdAt`
- `updatedAt`

## 7. API 계획

### 7.1 발급 티켓 수정

```http
PATCH /api/tickets/{ticketId}
Content-Type: application/json
```

요청 예시:

```json
{
  "name": "PERFO VIP Entry",
  "venue": "올림픽공원 체조경기장",
  "googlePlaceId": "ChIJPLACE",
  "detailAddress": "2층 A게이트 앞",
  "validDate": "2026-08-15",
  "openAt": "2026-08-15T17:00:00+09:00",
  "totalCount": 300,
  "allowDuplicate": false,
  "maxPerUser": 1,
  "status": "ISSUING",
  "imageKey": "ticket-images/owner-1/uuid.webp"
}
```

응답 예시:

```json
{
  "id": 12,
  "name": "PERFO VIP Entry",
  "venue": "올림픽공원 체조경기장",
  "googlePlaceId": "ChIJPLACE",
  "detailAddress": "2층 A게이트 앞",
  "validDate": "2026-08-15",
  "openAt": "2026-08-15T17:00:00+09:00",
  "status": "ISSUING",
  "issuedCount": 120,
  "totalCount": 300,
  "allowDuplicate": false,
  "maxPerUser": 1,
  "imageKey": "ticket-images/owner-1/uuid.webp",
  "imageUrl": "/api/tickets/12/image",
  "ownerUserId": "owner-1"
}
```

검증:

- 티켓 소유자 본인만 수정 가능
- `openAt` 형식 검증
- `totalCount < issuedCount`가 되지 않도록 제한
- `EXPIRED` 상태에서는 일부 필드 수정 금지 여부를 서버에서 강제

### 7.2 티켓 이미지 업로드

권장 초기안은 일반 수정 API와 분리한다.

```http
POST /api/tickets/{ticketId}/image
Content-Type: multipart/form-data
```

요청:

```text
file: image/jpeg | image/png | image/webp
```

응답:

```json
{
  "imageKey": "ticket-images/owner-1/uuid.webp",
  "imageUrl": "/api/tickets/12/image"
}
```

이후 일반 수정 저장 시 `imageKey`를 함께 반영한다.

이유:

- JSON 수정 API와 multipart 업로드를 한 엔드포인트에 섞지 않으면 테스트와 에러 처리가 단순해진다.
- 업로드 성공 후 사용자가 저장을 취소하는 경우를 처리하기 쉬워진다.

### 7.3 티켓 이미지 조회

```http
GET /api/tickets/{ticketId}/image
```

역할:

- object key를 직접 노출하지 않고 브라우저 표시 URL을 고정한다.
- 필요 시 권한 검증 또는 캐시 제어를 넣기 쉽다.

## 8. 이미지 저장소 계획

### 8.1 저장 구조

`docs/02_Development/00_Plan/10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md`의 구조를 재사용한다.

후보 object key:

```text
ticket-images/{ownerUserId}/{uuid}.{ext}
```

예시:

```text
ticket-images/owner-1/7f1b5c0e-9e2b-4f50-a6de-1f9a8e42c001.webp
```

### 8.2 버킷 전략

선택지:

1. `profile-images` 버킷 재사용
2. `ticket-images` 전용 버킷 추가

권장안:

- `ticket-images` 전용 버킷 추가

이유:

- 만료 정책, 접근 패턴, 예상 용량이 프로필 이미지와 다르다.
- 추후 썸네일 변환이나 공개 정책 분리를 하기 쉽다.

### 8.3 검증 기준

프로필 이미지와 동일하게 최소 기준을 적용한다.

- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`
- SVG 업로드 금지
- 최대 크기 제한 권장: 5MB
- 파일명은 신뢰하지 않고 서버가 object key 생성
- 필요 시 가로세로 비율 또는 최소 해상도 검증 추가

## 9. 프론트엔드 작업 계획

### 9.1 티켓 폼 확장

대상:

- `frontend/app/[locale]/(main)/my-tickets/my-tickets.types.ts`
- `frontend/app/[locale]/(main)/my-tickets/page.tsx`

추가 필드:

- `openAt`
- `imageUrl`
- `imageKey`

UI 변경:

- 날짜 입력 아래에 `오픈 시간` `datetime-local` 입력 추가
- 대표 이미지 업로드 버튼 추가
- 현재 이미지가 있으면 미리보기와 교체 액션 제공
- 저장 중, 업로드 중, 실패 상태를 분리 표시

### 9.2 수정 동작을 실제 API로 연결

현재 문제:

- 수정 시 `setTickets`만 호출하고 백엔드 저장이 없다.

변경 계획:

- 생성은 `POST /api/tickets`
- 수정은 `PATCH /api/tickets/{ticketId}`
- 이미지 업로드는 `POST /api/tickets/{ticketId}/image`

프론트 동작 순서:

1. 편집 시 기존 값 로드
2. 이미지 교체 시 먼저 업로드
3. 업로드 성공 시 `imageKey` 확보
4. 일반 수정 저장 API 호출
5. 성공 응답으로 목록 상태 갱신

### 9.3 상태 수정 UX

권장 방식:

- free text나 임의 select가 아니라 허용 상태만 보여주는 select 사용
- 상태 변경 시 설명 문구를 함께 노출
  - 예: `INACTIVE: 아직 운영 시작 전`
  - 예: `ISSUING: 예약 접수 중`
  - 예: `VERIFYING: 현장 검표 중`
  - 예: `EXPIRED: 종료됨`

추가 UX:

- `openAt`이 미래인데 `VERIFYING`을 선택하면 경고 문구 표시
- `issuedCount > 0`일 때 `totalCount` 축소 제한 설명 표시

### 9.4 다국어 메시지

대상:

- `frontend/messages/ko.json`
- `frontend/messages/en.json`
- `frontend/messages/ja.json`

추가 키 예시:

- `myTickets.fieldOpenAt`
- `myTickets.fieldOpenAtPlaceholder`
- `myTickets.fieldImage`
- `myTickets.uploadImage`
- `myTickets.replaceImage`
- `myTickets.statusHintInactive`
- `myTickets.statusHintIssuing`
- `myTickets.statusHintVerifying`
- `myTickets.statusHintExpired`
- `myTickets.openAtRequiredForVerifying`

## 10. 백엔드 작업 계획

### 10.1 서비스 분리

후보 파일:

- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/TicketImageStorageService.kt`
- `backend/src/main/kotlin/com/perfo/backend/controller/TicketController.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/...`

권장 역할:

- `TicketService`
  - 생성, 조회, 일반 수정, 상태 검증
- `TicketImageStorageService`
  - 업로드, 조회, 삭제, object key 생성
- 별도 validator 또는 helper
  - 상태 전이 규칙
  - `openAt` 검증

### 10.2 알림 연계

이미 `updateIssuedStatus`에서 `NotificationBridgeService`를 호출하고 있으므로, 일반 수정 API에서 상태가 바뀐 경우에도 같은 브리지를 재사용한다.

규칙:

- 상태가 실제로 변한 경우에만 알림 발생
- 이름, 장소, 이미지 변경만으로는 상태 알림을 보내지 않음

### 10.3 권한 검증

- 세션 사용자와 `ownerUserId` 일치 여부 확인
- 이미지 조회 API는 초기에는 공개 가능하더라도, 수정과 업로드는 반드시 소유자 제한
- 추후 관리자 권한이 생기면 role 기반 예외를 추가

## 11. 테스트 계획

### 11.1 백엔드 단위 테스트

대상:

- `backend/src/test/kotlin/com/perfo/backend/service/TicketServiceTest.kt`

추가 케이스:

- 수정 성공
- 없는 티켓 수정 실패
- 소유자 불일치 실패
- `openAt` 이전 `VERIFYING` 전환 실패
- `issuedCount`보다 작은 `totalCount` 수정 실패
- 상태 변경 시에만 알림 발생

### 11.2 백엔드 컨트롤러 테스트

대상:

- `backend/src/test/kotlin/com/perfo/backend/controller/TicketControllerTest.kt`

추가 케이스:

- `PATCH /api/tickets/{ticketId}` 성공
- 잘못된 datetime 형식 400
- 이미지 업로드 성공
- 허용하지 않은 MIME 400

### 11.3 프론트 테스트

대상:

- `frontend/app/api/tickets/__tests__/route.test.ts`
- `frontend/app/[locale]/(main)/my-tickets/__tests__/MyTicketsPage.test.tsx`

추가 케이스:

- 수정 저장 시 `PATCH /api/tickets/{ticketId}` 호출
- `openAt` 필드 렌더링 및 기존값 표시
- 이미지 업로드 성공 후 저장 payload에 `imageKey` 반영
- `openAt` 미래 상태에서 `VERIFYING` 경고 노출

### 11.4 E2E

후보:

- `frontend/e2e/my-tickets.spec.ts`

시나리오:

1. 운영자가 티켓 생성
2. 오픈 시간 지정
3. 이미지 업로드
4. 저장 후 목록 카드에 반영 확인
5. 수정 재진입 시 기존 값 유지 확인

## 12. 구현 순서

1. 운영자용 티켓 영속 모델 방향 확정
2. DTO와 응답 계약에 `openAt`, `imageKey`, `imageUrl` 추가
3. 티켓 수정 API 구현
4. 티켓 이미지 업로드/조회 API 구현
5. `my-tickets` 폼과 카드 UI 확장
6. 수정 동작을 실제 API에 연결
7. 상태 전이 규칙과 알림 연계 보강
8. 단위 테스트, 통합 테스트, E2E 보강

## 13. 오픈 질문

- 운영 상태 전이를 완전 수동으로 둘지, `openAt` 도달 시 자동 전환까지 포함할지
- `validDate`와 `openAt` 외에 `closeAt` 또는 `expiresAt`이 필요한지
- 티켓 이미지를 예약자 카드와 운영자 카드에 동일하게 노출할지
- 만료 티켓의 이미지 교체와 텍스트 수정까지 허용할지
- 티켓 이미지도 프로필 이미지처럼 백엔드 프록시 URL로만 제공할지, presigned URL을 허용할지

## 14. 권장 결론

현재 구조에서 가장 먼저 막아야 할 문제는 `수정이 서버에 저장되지 않는 점`이다. 따라서 1차 구현은 `PATCH /api/tickets/{ticketId}`와 `POST /api/tickets/{ticketId}/image`를 추가하고, `my-tickets` 편집 시트에 `openAt`과 이미지 업로드를 붙이는 데 집중하는 것이 맞다.

그 다음 단계에서 `openAt` 기반 자동 상태 전이와 전용 DB 엔티티 정리를 이어가면, 지금 필요한 기능을 빠르게 제공하면서도 이후 QR 검표와 알림 계획 문서와 충돌 없이 확장할 수 있다.
