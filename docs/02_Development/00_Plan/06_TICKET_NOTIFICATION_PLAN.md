# 티켓 상태 변화 푸시 알림 구현 계획

> 기준 문서:
> `docs/01_Design/06_PWA_PUSH_GUIDE.md`
> `docs/01_Design/00_Architecture/04_REQUEST_PROCESSING_STRATEGY.md`
> `docs/02_Development/00_Plan/01_FRONTEND_PLAN.md`
> `docs/02_Development/00_Plan/02_BACKEND_PLAN.md`
>
> 이 문서는 티켓 상태 변화에 따라 푸시 알림을 발송하고, 사용자가 앱 안에서 알림 내역을 따로 확인할 수 있게 만드는 작업 계획이다.

## 1. 목표

- 티켓 상태가 바뀔 때 사용자에게 푸시 알림을 보낸다.
- 사용자는 헤더의 알림 내역 버튼으로 알림 목록을 확인할 수 있다.
- 푸시 알림과 앱 내 알림 내역은 같은 `Notification` 도메인 이벤트에서 파생된다.
- 푸시 수신 실패와 관계없이 앱 내 알림 내역은 저장되어야 한다.
- 알림은 중복 발송되지 않아야 하고, 같은 상태 변화에 대해 같은 알림이 여러 번 쌓이지 않아야 한다.
- 알림 클릭 시 관련 티켓 화면으로 이동한다.

## 2. 현재 상태

- `docs/01_Design/06_PWA_PUSH_GUIDE.md`에 PWA 푸시 알림 유지보수 가이드가 있다.
- `frontend/components/push/PushNotification.tsx`는 브라우저 구독/해제를 처리한다.
- `frontend/app/api/push/subscribe/route.ts`는 구독 정보를 메모리 `Map`에 저장하고 있다.
  - 프로덕션에서는 DB 저장으로 바꿔야 한다.
- `frontend/app/api/push/send/route.ts`는 테스트성 푸시 발송 API에 가깝다.
  - 실제 운영에서는 임의 payload 발송 API를 외부에 열어두면 안 된다.
- `frontend/public/sw.js`는 푸시 수신과 알림 클릭 이동을 처리한다.
- 프로필 화면에는 `푸시 알림 설정` 토글이 있으나 알림 내역 화면은 없다.

## 3. 핵심 원칙

- 푸시 알림은 최종 상태가 DB에 확정된 뒤 발행한다.
- 알림 내역 저장은 푸시 발송보다 우선한다.
  - 푸시가 실패해도 앱 내 알림 내역은 남아야 한다.
- 푸시 발송은 도메인 로직의 핵심 트랜잭션을 느리게 만들면 안 된다.
  - 초기에는 동기 호출도 가능하지만, 확장 구조는 비동기 워커 또는 이벤트 소비자 기준으로 설계한다.
- 사용자가 푸시를 꺼도 앱 내 알림 내역은 유지한다.
- 사용자가 앱 내 알림 내역을 읽음 처리할 수 있어야 한다.
- 알림 payload에는 민감 정보와 과도한 내부 식별자를 넣지 않는다.
- 알림 클릭 URL은 서버가 허용한 앱 내부 경로만 사용한다.

## 4. 알림 발생 조건

티켓 상태 변화 기준으로 알림을 발생시킨다.

### 4.1 예약자 대상 알림

- `PENDING -> PROCESSING`
  - 예: `티켓 요청을 처리 중입니다.`
- `PROCESSING -> SUCCESS`
  - 예: `티켓 예약이 완료되었습니다.`
- `PROCESSING -> FAILED`
  - 예: `티켓 예약에 실패했습니다.`
- `PROCESSING -> SOLD_OUT`
  - 예: `준비된 티켓이 모두 소진되었습니다.`
- `ANY -> DUPLICATE`
  - 예: `이미 신청한 티켓입니다.`
- `WAITING -> MY_TURN`
  - 예: `입장 차례가 되었습니다. QR을 준비해 주세요.`
- `MY_TURN -> USED`
  - 예: `티켓 사용이 완료되었습니다.`
- `AVAILABLE -> EXPIRED`
  - 예: `티켓 사용 시간이 만료되었습니다.`

### 4.2 발급자 대상 알림

- 발급 티켓이 검표 가능 상태가 됨
  - 예: `검표를 시작할 수 있습니다.`
- 발급 티켓이 만료됨
  - 예: `발급한 티켓의 유효 기간이 종료되었습니다.`
- 대량 검표 또는 운영 이벤트는 초기 범위에서 제외한다.

## 5. 알림 채널

### 5.1 앱 내 알림

- 항상 저장한다.
- 사용자는 헤더 알림 버튼으로 목록을 확인한다.
- 읽음/안 읽음 상태를 제공한다.
- 알림 클릭 시 관련 티켓 화면으로 이동한다.

### 5.2 웹 푸시 알림

- 사용자가 브라우저 푸시 권한을 허용하고 구독한 경우에만 발송한다.
- 푸시 실패는 앱 내 알림 저장 성공 여부에 영향을 주지 않는다.
- 만료된 구독은 삭제하거나 비활성화한다.

## 6. 프론트엔드 작업 계획

### 6.1 헤더 알림 버튼

대상 화면:

- `frontend/app/[locale]/(main)/reserved/page.tsx`
- `frontend/app/[locale]/(main)/my-tickets/page.tsx`
- `frontend/app/[locale]/(main)/profile/page.tsx`
- 이후 공통 header 컴포넌트로 통합 가능

권장 구현:

- `frontend/components/notifications/NotificationButton.tsx`
- `frontend/components/notifications/notification-button.types.ts`

역할:

- 헤더 오른쪽에 알림 아이콘 버튼을 표시한다.
- 안 읽은 알림 개수를 badge로 표시한다.
- 버튼 클릭 시 알림 내역 화면 또는 bottom sheet를 연다.

UX 기준:

- 알림 버튼은 검색 버튼과 경쟁하지 않도록 아이콘 크기와 위치를 통일한다.
- 읽지 않은 알림이 있을 때만 작은 count badge를 표시한다.
- count가 `99`를 넘으면 `99+`로 표시한다.
- 알림이 없을 때는 빈 상태를 명확히 보여준다.

### 6.2 알림 내역 UI

초기 구현 후보:

- 모바일 중심이면 bottom sheet
- 독립 화면이 필요하면 `/[locale]/notifications`

권장 초기안:

- `frontend/app/[locale]/(main)/notifications/page.tsx`

이유:

- 알림 내역은 사용자가 따로 다시 확인하는 정보이므로 URL을 가진 화면이 낫다.
- 푸시 클릭 시 동일한 화면 또는 알림 대상 티켓 화면으로 안정적으로 이동할 수 있다.

화면 구성:

- 상단: 뒤로가기, `알림`
- 요약: 안 읽은 알림 수
- 액션: `모두 읽음`
- 목록:
  - 상태 아이콘
  - 제목
  - 설명
  - 티켓명 또는 관련 정보
  - 발생 시간
  - 읽음/안 읽음 표시
- 빈 상태:
  - `아직 알림이 없습니다.`

### 6.3 알림 타입과 상태

후보 파일:

- `frontend/components/notifications/notification.types.ts`
- `frontend/components/notifications/notification.constants.ts`

타입 예시:

```ts
export type NotificationType =
    | "TICKET_PROCESSING"
    | "TICKET_SUCCESS"
    | "TICKET_FAILED"
    | "TICKET_SOLD_OUT"
    | "TICKET_DUPLICATE"
    | "TICKET_MY_TURN"
    | "TICKET_USED"
    | "TICKET_EXPIRED"
    | "ISSUED_TICKET_VERIFYING"
    | "ISSUED_TICKET_EXPIRED";

export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    targetUrl: string;
    readAt?: string;
    createdAt: string;
}
```

### 6.4 API 클라이언트

필요 API:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/{notificationId}/read`
- `PATCH /api/notifications/read-all`

프론트는 다음 상태를 처리한다.

- 로딩
- 빈 목록
- 에러
- 목록 pagination 또는 cursor
- 읽음 처리 중 optimistic update

### 6.5 Service Worker 클릭 처리

대상 파일:

- `frontend/public/sw.js`

계획:

- payload의 `url`을 열거나 이미 열린 창을 해당 URL로 이동시킨다.
- URL은 앱 내부 경로만 사용한다.
- 알림 클릭 자체를 읽음 처리하려면 클라이언트가 열린 뒤 API를 호출하는 구조로 처리한다.
  - Service Worker에서 인증 API 호출을 복잡하게 만들지 않는다.

## 7. 백엔드 작업 계획

### 7.1 도메인 모델

필요 개념:

- `Notification`
  - 앱 내 알림 내역
- `PushSubscription`
  - 브라우저 푸시 구독 정보
- `NotificationEvent`
  - 티켓 상태 변화에서 생성되는 알림 요청
- `NotificationDelivery`
  - 푸시 발송 시도와 결과

### 7.2 데이터 저장 계획

`notifications`:

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `target_url`
- `source_type`
- `source_id`
- `dedupe_key`
- `read_at`
- `created_at`

`push_subscriptions`:

- `id`
- `user_id`
- `endpoint`
- `p256dh`
- `auth`
- `user_agent`
- `enabled`
- `created_at`
- `updated_at`
- `last_failed_at`

`notification_deliveries`:

- `id`
- `notification_id`
- `channel`
- `status`
- `attempt_count`
- `last_error`
- `sent_at`
- `created_at`
- `updated_at`

중요 제약:

- `push_subscriptions.endpoint`는 unique로 둔다.
- `notifications.dedupe_key`는 user 단위 unique로 둔다.
  - 예: `user:{userId}:ticket:{ticketId}:status:{newStatus}`

### 7.3 알림 생성 처리

티켓 상태가 바뀌면 다음 순서로 처리한다.

1. 티켓 상태 변경을 DB에 확정한다.
2. 상태 변경 이벤트를 만든다.
3. 알림 대상 사용자를 계산한다.
4. 알림 템플릿을 선택한다.
5. `dedupe_key`로 중복 알림 생성을 방지한다.
6. 앱 내 알림을 저장한다.
7. 푸시 구독이 켜져 있으면 푸시 발송을 요청한다.
8. 푸시 발송 결과를 delivery 이력에 저장한다.

### 7.4 푸시 구독 API

현재 `/api/push/subscribe`는 메모리 저장이므로 DB 저장으로 바꾼다.

필요 API:

- `POST /api/push/subscriptions`
- `DELETE /api/push/subscriptions`
- `GET /api/push/subscriptions/me`

요구사항:

- 인증 사용자 기준으로 저장한다.
- endpoint 중복 등록은 update로 처리한다.
- 사용자가 푸시 알림을 끄면 구독을 삭제하거나 `enabled=false`로 바꾼다.
- 410 Gone, 404 Not Found 등 만료 구독은 비활성화한다.

### 7.5 푸시 발송 구조

초기 구현:

- 상태 변경 서비스에서 알림 저장 후 푸시 발송 서비스를 호출한다.

확장 구현:

- `NotificationRequested` 이벤트 발행
- notification worker가 이벤트 소비
- 앱 내 알림 저장
- 푸시 발송
- delivery 이력 기록

중요:

- 티켓 상태 변경 트랜잭션과 외부 푸시 서비스 호출을 강하게 묶지 않는다.
- 푸시 발송 실패 때문에 티켓 상태 변경이 rollback되면 안 된다.

## 8. API 계약

알림 목록:

```http
GET /api/notifications?cursor={cursor}&limit=20
```

응답:

```json
{
    "items": [
        {
            "id": "notification_1",
            "type": "TICKET_SUCCESS",
            "title": "티켓 예약이 완료되었습니다.",
            "body": "PERFO Summer Festival 티켓이 예약되었습니다.",
            "targetUrl": "/ko/reserved/123",
            "readAt": null,
            "createdAt": "2026-04-28T12:00:00+09:00"
        }
    ],
    "nextCursor": null
}
```

안 읽은 알림 수:

```http
GET /api/notifications/unread-count
```

응답:

```json
{
    "count": 3
}
```

읽음 처리:

```http
PATCH /api/notifications/{notificationId}/read
```

전체 읽음:

```http
PATCH /api/notifications/read-all
```

푸시 payload:

```json
{
    "title": "입장 차례가 되었습니다.",
    "body": "PERFO Summer Festival QR을 준비해 주세요.",
    "url": "/ko/reserved/123",
    "tag": "ticket-123-MY_TURN"
}
```

## 9. 보안 중요 사항

- 알림 목록 API는 반드시 인증된 사용자 본인의 알림만 반환한다.
- `targetUrl`은 앱 내부 경로만 허용한다.
  - 외부 URL redirect는 허용하지 않는다.
- 푸시 발송 API는 일반 클라이언트가 임의 payload로 호출할 수 없어야 한다.
  - 운영용 내부 서비스 또는 서버 전용 함수로 제한한다.
- 구독 endpoint와 key는 사용자 식별 가능한 민감 데이터로 보고 보호한다.
- 로그에 push key 전체를 남기지 않는다.
- 알림 본문에 개인정보, 결제 정보, 내부 디버깅 값을 넣지 않는다.
- 사용자가 로그아웃하거나 계정 탈퇴하면 관련 구독을 비활성화한다.

## 10. 중복과 순서 보장

- 상태 변화 이벤트마다 `eventId` 또는 `dedupeKey`를 만든다.
- 같은 사용자, 같은 티켓, 같은 상태에 대한 알림은 한 번만 생성한다.
- 상태가 빠르게 연속 변경될 수 있으므로 최신 상태 기준 target URL이 유효해야 한다.
- 푸시가 여러 번 발송되지 않도록 delivery 이력 또는 idempotency key를 사용한다.
- 푸시 서비스는 전달 순서를 보장하지 않으므로 앱 내 알림 목록은 서버 `createdAt` 기준으로 정렬한다.

## 11. 테스트 계획

### 11.1 백엔드 단위 테스트

- 티켓 상태 변화별 알림 타입이 올바르게 매핑된다.
- 같은 상태 변화 이벤트가 두 번 들어와도 알림은 한 번만 생성된다.
- 푸시 구독이 없는 사용자도 앱 내 알림은 생성된다.
- 푸시 발송 실패가 티켓 상태 변경 결과를 rollback하지 않는다.
- 만료된 push subscription은 비활성화된다.

### 11.2 백엔드 통합 테스트

- 티켓 상태가 `SUCCESS`로 확정되면 알림 내역이 저장된다.
- `MY_TURN` 상태가 되면 예약자에게 알림이 생성된다.
- 읽음 처리 API가 본인 알림에만 동작한다.
- 다른 사용자의 알림 읽음 처리는 거부된다.
- unread count가 읽음 처리 후 감소한다.

### 11.3 프론트엔드 단위 테스트

- 헤더 알림 버튼이 unread count badge를 표시한다.
- count가 0이면 badge를 숨긴다.
- count가 99를 넘으면 `99+`로 표시한다.
- 알림 목록이 빈 상태, 로딩, 에러 상태를 표시한다.
- 알림 클릭 시 target URL로 이동한다.

### 11.4 E2E 테스트

- 프로필에서 푸시 알림 설정을 켠다.
- 헤더 알림 버튼으로 알림 내역 화면에 진입한다.
- mock 알림 목록이 표시된다.
- 알림을 클릭하면 관련 티켓 화면으로 이동한다.
- `모두 읽음`을 누르면 unread badge가 사라진다.

## 12. 구현 순서

1. 알림 타입, 상태 변화 매핑, 템플릿을 정의한다.
2. 백엔드 `Notification` 저장 모델과 API 계약을 만든다.
3. 알림 목록, unread count, 읽음 처리 API 테스트를 작성한다.
4. 푸시 구독 저장을 메모리에서 DB 기반으로 바꾼다.
5. 티켓 상태 변경 지점에서 `NotificationRequested`를 생성한다.
6. 앱 내 알림 저장을 먼저 연결한다.
7. 푸시 발송과 delivery 이력 저장을 연결한다.
8. 헤더 알림 버튼을 공통 컴포넌트로 만든다.
9. `Reserved`, `My Tickets`, `Profile` 헤더에 알림 버튼을 추가한다.
10. 알림 내역 화면을 만든다.
11. Service Worker 클릭 이동을 target URL 정책에 맞게 점검한다.
12. 단위, 통합, E2E 테스트를 추가한다.

## 13. 완료 기준

- 티켓 상태 변화에 따라 앱 내 알림이 생성된다.
- 푸시를 허용한 사용자에게 웹 푸시가 발송된다.
- 푸시 발송 실패와 무관하게 앱 내 알림 내역은 남는다.
- 헤더 알림 버튼에서 안 읽은 알림 수가 보인다.
- 사용자는 알림 내역 화면에서 알림을 확인하고 읽음 처리할 수 있다.
- 알림 클릭 시 관련 티켓 화면으로 이동한다.
- 같은 상태 변화로 중복 알림이 생성되지 않는다.
- 인증 사용자는 본인 알림만 조회할 수 있다.

## 14. 보류 가능 항목

- 알림 카테고리별 on/off 세부 설정
- 이메일/SMS 알림 채널
- 운영자 공지 알림
- 실시간 in-app toast 또는 SSE 기반 즉시 반영
- 알림 검색과 필터
- 대량 발송 관리자 화면

초기 구현은 티켓 상태 변화 기반 앱 내 알림, 웹 푸시, 헤더 알림 내역 진입을 완료 기준으로 삼는다.
