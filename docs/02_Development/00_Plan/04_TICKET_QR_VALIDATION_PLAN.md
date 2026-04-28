# 티켓 QR 코드 검증 구현 계획

> 참고 화면:
> `docs/01_Design/02_storyboard/06_티켓 리스트 디자인.png`
>
> 이 문서는 예약자가 QR을 제시하고, 발급자가 QR을 스캔해 티켓을 검증하는 기능을 구현하기 위한 작업 계획이다.

## 1. 목표

- 예약자는 본인이 예약한 티켓의 QR 코드를 앱에서 제시할 수 있다.
- 발급자는 본인이 발급한 티켓에 대해서만 QR 코드를 스캔하고 검증할 수 있다.
- 하나의 예약 티켓은 성공 검증 후 다시 사용할 수 없어야 한다.
- QR 코드는 탈취되거나 재사용되더라도 피해가 제한되도록 짧은 수명의 토큰으로 구성한다.
- 검증 성공, 실패, 중복 사용, 만료, 권한 오류가 사용자에게 명확히 구분되어 보여야 한다.

## 2. 사용자 흐름

### 2.1 예약자 QR 표시 흐름

1. 예약자는 `Reserved Tickets` 목록에 진입한다.
2. 사용 가능한 티켓 카드에서 `QR 표시` 버튼을 누른다.
3. 앱은 예약 상세 화면으로 이동한다.
4. 서버에서 QR 표시용 단기 토큰을 발급받는다.
5. 화면은 티켓명, 사용 장소, 날짜, 순번, QR 코드를 표시한다.
6. 토큰 만료 시간이 가까워지면 자동으로 새 토큰을 요청한다.
7. 이미 사용 완료 또는 만료된 티켓은 QR 대신 상태 안내를 표시한다.

### 2.2 발급자 QR 검표 흐름

1. 발급자는 `My Tickets` 목록에 진입한다.
2. 검표 가능한 발급 티켓에서 `검표` 버튼을 누른다.
3. 앱은 `Ticket Scan` 화면으로 이동한다.
4. 카메라 권한을 요청하고 QR 스캐너를 시작한다.
5. QR 코드가 인식되면 스캐너를 일시 중지하고 서버에 검증 요청을 보낸다.
6. 성공하면 티켓 번호와 성공 상태를 보여준 뒤 다시 스캔 대기 상태로 돌아간다.
7. 실패하면 실패 사유와 재스캔 또는 수동 입력 액션을 제공한다.

## 3. UX 원칙

- 예약자 화면의 버튼 문구는 `QR 스캔`이 아니라 `QR 표시`로 사용한다.
  - 예약자는 스캔하는 사람이 아니라 QR을 제시하는 사람이다.
- 발급자 화면의 버튼 문구는 `검표` 또는 `QR 스캔`으로 사용한다.
- 검표 화면은 하단 탭을 숨기는 집중형 화면으로 구현한다.
  - 현장 검표 중 하단 네비게이션을 잘못 누르는 문제를 줄이기 위함이다.
- 카메라 영역은 충분히 크게 잡는다.
  - 현장에서는 흔들림, 어두운 조명, 반사, 낮은 화면 밝기가 자주 발생한다.
- 성공 상태는 짧고 명확하게 표시한다.
  - 예: `121번 티켓 확인 완료`
- 실패 상태는 원인과 다음 행동을 함께 제공한다.
  - 예: `유효하지 않은 티켓입니다`, `다시 스캔하거나 티켓 번호를 확인해 주세요.`
- 연속 검표를 고려해 성공 후 자동으로 스캔 대기 상태로 돌아간다.
- 카메라 권한 거부, 브라우저 미지원, 카메라 점유 상태를 별도 상태로 처리한다.

## 4. 라우팅 계획

### 4.1 예약자 QR 표시 페이지

- 권장 경로: `frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx`
- 진입 지점:
  - `frontend/components/tickets/TicketCard.tsx`
  - `frontend/app/[locale]/(main)/reserved/page.tsx`
- 역할:
  - 예약 티켓 상세 정보 조회
  - QR 토큰 발급 요청
  - QR 코드 표시
  - 사용 완료, 만료, 사용 불가 상태 표시

### 4.2 발급자 검표 페이지

- 권장 경로: `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx`
- `(scanner)` route group을 별도로 두는 이유:
  - 하단 탭을 숨긴 검표 전용 레이아웃을 만들기 쉽다.
  - 검표 화면은 목록 탐색 화면이 아니라 현장 작업 화면이다.
- 진입 지점:
  - `frontend/components/tickets/IssuedTicketCard.tsx`
  - `frontend/app/[locale]/(main)/my-tickets/page.tsx`
- 역할:
  - 발급 티켓 검표 가능 여부 조회
  - 카메라 기반 QR 스캔
  - 검증 API 호출
  - 결과 상태 표시

## 5. 프론트엔드 작업 계획

### 5.1 타입 정의

다음 타입을 먼저 정의한다.

```ts
type QrDisplayStatus = "AVAILABLE" | "USED" | "EXPIRED" | "NOT_OPEN";

type TicketValidationResult =
    | "SUCCESS"
    | "ALREADY_USED"
    | "INVALID"
    | "EXPIRED"
    | "WRONG_TICKET"
    | "NOT_OPEN"
    | "FORBIDDEN";
```

필요 DTO 예시:

```ts
interface TicketQrTokenResponse {
    token: string;
    expiresAt: string;
}

interface TicketValidationRequest {
    qrToken: string;
}

interface TicketValidationResponse {
    result: TicketValidationResult;
    ticketNumber?: number;
    usedAt?: string;
    message?: string;
}
```

### 5.2 예약자 QR 표시 컴포넌트

- 후보 파일:
  - `frontend/components/tickets/TicketQrDisplay.tsx`
  - `frontend/components/tickets/ticket-qr-display.types.ts`
- 책임:
  - QR 토큰을 QR 이미지로 렌더링한다.
  - 만료 시간을 표시하거나 내부적으로 자동 갱신한다.
  - 네트워크 오류 시 재시도 버튼을 제공한다.
- 구현 메모:
  - QR 생성 라이브러리가 필요하다.
  - QR 내용은 예약 ID나 사용자 ID를 직접 담지 않는다.
  - QR에는 서버가 발급한 opaque token만 담는다.

### 5.3 발급자 QR 스캐너 컴포넌트

- 후보 파일:
  - `frontend/components/tickets/TicketQrScanner.tsx`
  - `frontend/components/tickets/ticket-qr-scanner.types.ts`
- 책임:
  - 카메라 권한 요청
  - QR 인식
  - 중복 스캔 방지
  - 검증 API 호출
  - 검증 결과 표시
- 구현 메모:
  - 브라우저 내장 `BarcodeDetector`는 지원 범위가 제한적이므로 단독 의존하지 않는다.
  - 실사용은 `@zxing/browser` 같은 라이브러리를 우선 검토한다.
  - `BarcodeDetector`를 사용할 경우 지원 브라우저에서만 progressive enhancement로 사용한다.
  - 스캔 결과를 받은 뒤 서버 응답 전까지 스캐너를 pause한다.
  - 같은 QR 값이 짧은 시간 안에 반복 인식되어도 검증 요청은 한 번만 보낸다.

### 5.4 기존 화면 연결

- `TicketCard`
  - 현재 `QR 스캔` 문구를 예약자 관점에 맞게 `QR 표시`로 변경한다.
  - 사용 가능한 티켓만 QR 표시 페이지로 이동시킨다.
- `IssuedTicketCard`
  - `검표` 버튼에 `/my-tickets/{ticketId}/scan` 링크 또는 클릭 핸들러를 연결한다.
  - `ISSUING`, `VERIFYING` 상태에서만 검표 버튼을 노출한다.
- `messages/*.json`
  - QR 표시, 검표, 성공/실패 상태 문구를 다국어 키로 분리한다.

## 6. 백엔드 작업 계획

### 6.1 도메인 모델

최소한 다음 개념을 분리한다.

- `Ticket`
  - 발급자가 만든 티켓 상품 또는 이벤트 단위
- `Reservation` 또는 `IssuedReservation`
  - 예약자에게 발급된 개별 사용권
- `QrToken`
  - 예약자 QR 표시에 사용되는 단기 검증 토큰
- `TicketValidationHistory`
  - 검표 시도와 결과 이력

### 6.2 상태 모델

예약 티켓 사용 상태:

- `NOT_OPEN`: 아직 사용 가능 시간이 아님
- `AVAILABLE`: 사용 가능
- `USED`: 사용 완료
- `EXPIRED`: 기간 만료
- `CANCELED`: 취소됨

검표 결과:

- `SUCCESS`: 검표 성공
- `ALREADY_USED`: 이미 사용됨
- `INVALID`: 토큰 형식, 서명, 데이터가 유효하지 않음
- `EXPIRED`: QR 토큰 또는 티켓 자체가 만료됨
- `WRONG_TICKET`: 다른 발급 티켓의 QR임
- `NOT_OPEN`: 아직 검표 가능 시간이 아님
- `FORBIDDEN`: 검표 권한 없음

### 6.3 API 계약

예약자 QR 토큰 발급:

```http
POST /api/reservations/{reservationId}/qr-token
```

응답:

```json
{
    "token": "opaque-short-lived-token",
    "expiresAt": "2026-04-28T12:00:30+09:00"
}
```

발급자 QR 검증:

```http
POST /api/tickets/{ticketId}/validations
Content-Type: application/json
```

요청:

```json
{
    "qrToken": "opaque-short-lived-token"
}
```

응답:

```json
{
    "result": "SUCCESS",
    "ticketNumber": 121,
    "usedAt": "2026-04-28T12:00:10+09:00"
}
```

### 6.4 검증 처리 순서

1. 인증 사용자를 확인한다.
2. 사용자가 `ticketId`의 발급자 또는 검표 권한자인지 확인한다.
3. QR 토큰 형식과 서명을 검증한다.
4. QR 토큰 만료 시간을 검증한다.
5. 토큰에 연결된 예약 티켓을 조회한다.
6. 예약 티켓이 요청한 `ticketId`에 속하는지 확인한다.
7. 예약 티켓의 사용 가능 시간과 만료 여부를 확인한다.
8. 이미 사용된 티켓인지 확인한다.
9. 트랜잭션 안에서 사용 상태를 `USED`로 변경하고 검증 이력을 저장한다.
10. 성공 응답을 반환한다.

## 7. 보안 중요 사항

- QR에는 `reservationId`, `userId`, `ticketId` 같은 내부 식별자를 평문으로 넣지 않는다.
- QR 토큰은 짧은 만료 시간을 가진다.
  - 권장: 30초에서 60초
- 검증은 반드시 서버에서 수행한다.
  - 프론트에서 QR 값을 해석해 성공 처리하면 안 된다.
- 검표 성공 처리는 원자적으로 수행한다.
  - 동시에 같은 QR을 두 번 검증해도 한 요청만 성공해야 한다.
- 발급자 또는 권한 있는 검표자만 해당 티켓을 검증할 수 있어야 한다.
- 검표 실패 응답은 필요한 수준으로만 정보를 제공한다.
  - 공격자가 토큰 유효성, 티켓 존재 여부를 과도하게 추론하지 못하게 한다.
- 검표 이력은 감사 로그로 남긴다.
  - 누가, 언제, 어떤 티켓을, 어떤 결과로 검증했는지 저장한다.
- 카메라 권한은 클라이언트 권한일 뿐 보안 경계가 아니다.
  - 보안 판단은 항상 서버의 인증/인가/상태 검증을 기준으로 한다.

## 8. 동시성 중요 사항

같은 QR이 여러 기기에서 거의 동시에 검표될 수 있다. 따라서 사용 완료 처리는 반드시 DB 조건부 업데이트 또는 락으로 보호한다.

권장 방식:

```sql
UPDATE reservations
SET status = 'USED', used_at = now(), validated_by = :userId
WHERE id = :reservationId
  AND status = 'AVAILABLE';
```

- 업데이트된 row 수가 `1`이면 성공이다.
- 업데이트된 row 수가 `0`이면 이미 사용되었거나 상태가 바뀐 것이다.
- 이 경우 최신 상태를 다시 조회해 `ALREADY_USED`, `EXPIRED`, `NOT_OPEN` 등으로 응답한다.

## 9. 데이터 저장 계획

### 9.1 예약 티켓 테이블 필드

- `id`
- `ticket_id`
- `user_id`
- `ticket_number`
- `status`
- `valid_from`
- `valid_until`
- `used_at`
- `validated_by`
- `created_at`
- `updated_at`

### 9.2 검표 이력 테이블 필드

- `id`
- `ticket_id`
- `reservation_id`
- `validator_user_id`
- `result`
- `failure_reason`
- `validated_at`
- `client_ip`
- `user_agent`

개인정보와 운영 로그는 필요한 범위만 저장한다. IP와 user-agent 저장은 운영 정책에 맞춰 보관 기간을 정한다.

## 10. 테스트 계획

### 10.1 프론트엔드 단위 테스트

- 예약자 QR 표시 화면이 사용 가능 상태에서 QR을 렌더링한다.
- 사용 완료 상태에서는 QR 대신 완료 메시지를 렌더링한다.
- 검표 화면이 성공 응답에서 성공 상태를 표시한다.
- 검표 화면이 실패 응답별 메시지를 표시한다.
- 카메라 권한 실패 시 수동 입력 UI를 표시한다.
- 같은 QR 값이 반복 인식되어도 검증 요청이 중복 호출되지 않는다.

### 10.2 백엔드 단위 테스트

- 유효한 QR 토큰 검증 성공
- 만료된 QR 토큰 거부
- 서명이 잘못된 QR 토큰 거부
- 다른 티켓의 QR 토큰 거부
- 이미 사용된 예약 티켓 거부
- 권한 없는 사용자의 검표 거부

### 10.3 백엔드 통합 테스트

- 검표 성공 시 예약 상태가 `USED`로 바뀐다.
- 검표 성공 시 검표 이력이 저장된다.
- 동시 검증 요청 중 하나만 성공한다.
- 실패 검표도 필요한 감사 이력을 남긴다.

### 10.4 E2E 테스트

- `Reserved Tickets`에서 QR 표시 화면으로 이동한다.
- 사용 가능한 티켓에서 QR 표시 영역이 보인다.
- `My Tickets`에서 검표 화면으로 이동한다.
- 스캐너 mock 또는 수동 입력으로 성공 검표 결과를 확인한다.
- 이미 사용된 티켓을 다시 검표하면 실패 상태가 보인다.

## 11. 구현 순서

1. 백엔드 예약 티켓 상태 모델과 검표 결과 enum을 정의한다.
2. QR 토큰 발급/검증 서비스를 만든다.
3. 검표 API를 만들고 동시성 테스트를 먼저 작성한다.
4. 프론트 API route 또는 client fetch 함수를 정리한다.
5. 예약자 QR 표시 페이지를 만든다.
6. 발급자 검표 페이지와 스캐너 컴포넌트를 만든다.
7. 기존 카드 버튼 문구와 라우팅을 연결한다.
8. 실패 상태별 UX 문구를 정리한다.
9. 단위 테스트, 통합 테스트, E2E 테스트를 추가한다.
10. 실제 모바일 브라우저에서 카메라 권한과 스캔 성능을 확인한다.

## 12. 완료 기준

- 예약자는 사용 가능한 티켓의 QR을 표시할 수 있다.
- 발급자는 자신의 티켓에 대해서만 검표할 수 있다.
- 검표 성공 후 같은 티켓은 다시 성공 처리되지 않는다.
- 검표 결과가 성공, 이미 사용됨, 만료, 잘못된 티켓, 권한 없음으로 구분된다.
- 검표 이력이 저장된다.
- 카메라 미지원 또는 권한 거부 상황에서도 수동 입력 fallback이 있다.
- 프론트, 백엔드, E2E 테스트가 핵심 흐름을 검증한다.

## 13. 보류 가능 항목

- 오프라인 검표
- 다중 검표자 권한 관리 화면
- 검표 통계 대시보드
- QR 위조 탐지 고도화
- 검표 단말 등록과 기기별 감사 로그

위 항목들은 기본 검표 정합성을 완성한 뒤 별도 마일스톤으로 분리한다.
