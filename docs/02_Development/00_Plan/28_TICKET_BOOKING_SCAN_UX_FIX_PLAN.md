# 티켓 예매/검표 UX 이슈 6건 분석 및 해결안

> 관련 코드:
> `frontend/components/events/PublicEventDetailPageContent.tsx`
> `frontend/components/events/PublicBookingButton.tsx`
> `frontend/components/tickets/BookableTicketCard.tsx`
> `frontend/components/tickets/ticket-shell.tsx`
> `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/use-qr-scanner.hooks.ts`
> `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/use-ticket-validation.hooks.ts`
> `frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/ScanResultPanel.tsx`
> `frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx`
> `frontend/app/api/tickets/[ticketId]/image/route.ts`
> `backend/src/main/kotlin/com/perfo/backend/service/EventQueryService.kt`
> `backend/src/main/kotlin/com/perfo/backend/service/TicketVerificationService.kt`

## 1. 범위

사용자가 제보한 아래 6개 이슈를 현재 코드 기준으로 확인했다.

1. `my-tickets`에서 설정한 티켓 이미지를 공개 예매 화면에서 불러오지 못함
2. `/events/{eventId}` 상세 문구와 메타데이터 배치가 투박하고 중복됨
3. iPad Safari에서 카메라 권한을 허용해도 검표 화면이 `카메라 오류`로 떨어짐
4. 검표 완료 UI의 결과 패널 배경 대비가 나쁘고, `Ticket verified` 영문 문구가 그대로 노출됨
5. 수동 토큰 입력 후 검표 요청해도 입력값이 그대로 남음
6. 검표 완료 후에도 뒤로 가기/직접 URL로 재예매 또는 QR 재발급이 가능함

이 문서는 구현보다 먼저 원인과 수정 방향을 고정하는 문서다.

## 2. 요약 결론

핵심 문제는 세 갈래다.

- 공개 예매 경로가 운영자 전용 리소스와 API를 그대로 재사용하고 있다.
- 예매/검표 결과 코드를 프런트가 충분히 해석하지 않고 있다.
- 스캐너 UI가 모바일 Safari의 카메라/디코드 실패를 너무 공격적으로 `fatal error`로 취급한다.

우선순위는 아래가 맞다.

### P0

- 공개 티켓 이미지용 읽기 전용 엔드포인트 분리
- `PublicBookingButton`이 `response.ok`만 보지 말고 `body.result`를 해석하도록 수정
- QR 토큰 발급을 `NOW_SERVING` 상태에서만 허용하도록 백엔드 차단

### P1

- 이벤트 상세 문구/메타 구조 정리
- 검표 결과 패널을 중립 배경 기반으로 재구성
- 수동 입력 제출 후 인풋 초기화

### P2

- iPad Safari 실기기 기준 카메라 초기화 플로우 재구성
- 예매 상세에서 이미 사용한 티켓 보유 사용자의 CTA를 사전 차단하는 UX 보강

## 3. 이슈별 분석과 해결안

### 3.1 공개 예매 화면에서 티켓 이미지를 못 불러오는 문제

#### 현재 원인

공개 이벤트 응답은 `imageUrl`을 내려주지만, 그 값은 현재 `/api/tickets/{ticketId}/image`다.

`EventQueryService.kt`

```kotlin
imageUrl = ticket.imageKey?.let { ticketImageStorageService.buildTicketImageUrl(ticketId) }
```

`TicketImageStorageService.buildTicketImageUrl()`은 결국 아래 경로를 만든다.

```kotlin
return "/api/tickets/$ticketId/image"
```

문제는 이 경로가 공개 이미지용이 아니라 운영자 인증용이라는 점이다.

- `frontend/app/api/tickets/[ticketId]/image/route.ts`의 `GET`은 세션이 없으면 `401`
- `backend TicketController.getTicketImage()`도 인증 사용자를 요구

즉 `events` 목록이나 `/events/{eventId}` 상세에서 쓰는 이미지는 공개 화면인데, 실제 읽기 경로는 비공개 경로라서 예매자 입장에서는 실패한다.

#### 해결 방향

운영자용 이미지 조회와 공개 예매용 이미지 조회를 분리해야 한다.

권장안:

1. 백엔드에 공개 읽기 전용 엔드포인트를 추가한다.
2. 공개 응답의 `imageUrl`은 새 공개 경로를 가리키게 바꾼다.
3. 기존 `/api/tickets/{ticketId}/image`는 운영자 수정 화면 전용으로 유지한다.

추천 경로 예시:

- `GET /api/public/tickets/{issuedTicketId}/image`
- 또는 `GET /api/events/{eventId}/image`

공개 조건은 최소한 아래 중 하나로 제한한다.

- 공개 상세 진입이 가능한 티켓
- `ISSUING` 또는 `VERIFYING` 상태인 티켓
- `LISTED`뿐 아니라 `LINK_ONLY`도 공유 URL 진입이 가능하면 허용

즉, "아무나 모든 티켓 이미지 열람"이 아니라 "공개 예매가 허용된 티켓의 커버 이미지"만 열어야 한다.

#### 테스트 보강

- 비로그인 사용자가 `/events/{id}`에서 이미지를 정상 로드하는지
- 공개 경로로는 이미지 조회 가능하지만, 운영자 전용 업로드/삭제 API는 여전히 인증이 필요한지
- `INACTIVE` 또는 종료된 티켓 이미지가 공개 엔드포인트로 과노출되지 않는지

### 3.2 이벤트 상세 문구가 투박하고, `링크 전용`/만료 정보가 중복되는 문제

#### 현재 원인

`PublicEventDetailPageContent.tsx`는 상세 메타를 아래처럼 라벨:값 형태로 나열한다.

```tsx
<p>{t("events.detailMetaOpen")}: {event.saleOpenAt}</p>
<p>{t("events.detailMetaClose")}: {event.saleCloseAt}</p>
<p>{t("events.detailMetaLimit")}: {event.maxPerUser}</p>
<p>{t("events.detailMetaDiscovery")}: ...</p>
```

동시에 `BookableTicketCard`는 아래 UI를 이미 제공한다.

- 장소 아래 `링크 전용` 칩
- `TicketShell`의 캘린더 아이콘 줄에 `validDate`

그래서 상세에서는 다음 중복이 생긴다.

- `링크 전용`이 칩과 본문 텍스트에 동시에 노출
- 날짜/만료 정보가 캘린더 줄과 본문 메타에 동시에 노출

#### 해결 방향

상세 페이지는 카드 공통 메타를 그대로 반복하지 말고, "한 문장 정보" 중심으로 다시 써야 한다.

권장 카피:

- `2026년 08월 15일 17시 00분 예매 시작`
- `2026년 08월 15일 23시 59분 예매 만료`
- `1인당 2장 예매 가능`
- `링크 전용`

구조 변경 권장안:

1. `PublicEventDetailPageContent`에서 날짜를 locale 기반 절대 시각으로 포맷한다.
2. 상세 페이지에서는 `링크 전용` 칩을 venue 하단에서 숨기고, 본문 한 줄로만 남긴다.
3. 상세 페이지에서는 캘린더 아이콘 줄의 `validDate`를 숨기거나, 본문 문장으로 대체한다.
4. `판매 시작`, `판매 종료`, `1인당 최대`, `노출 방식` 같은 관리형 라벨은 상세 뷰에서 제거한다.

구현 방법은 두 가지가 있다.

- `BookableTicketCard`에 `showLinkOnlyChip`, `showValidDateRow` 같은 옵션 prop 추가
- 또는 상세 전용 카드 조합 컴포넌트를 따로 만든다

이번 범위에서는 첫 번째가 더 작다.

#### 테스트 보강

- 상세 페이지에서 `링크 전용`이 한 번만 보이는지
- `노출 방식:` 같은 라벨이 더 이상 렌더링되지 않는지
- 날짜 문구가 locale에 맞는 포맷으로 보이는지

### 3.3 iPad Safari에서 카메라 허용 후에도 `카메라 오류`가 뜨는 문제

#### 현재 원인

현재 스캐너 훅은 `@zxing/browser`의 `decodeFromVideoDevice()`를 바로 호출하고, 콜백에서 `NotFoundException`이 아닌 에러가 한 번이라도 오면 즉시 `scannerStatus = "error"`로 바꾼다.

```ts
if (error && !(error instanceof Error && error.name === "NotFoundException")) {
    setScannerStatus("error");
}
```

이 구조는 "권한 획득 실패"와 "디코드 중 일시적 예외"를 구분하지 못한다.

현재 코드가 취약한 지점:

1. 카메라 스트림 확보 전용 단계가 없다.
2. 후면 카메라 선호 제약이 없다.
3. 디코드 루프에서 발생한 비치명적 예외도 전부 `fatal error`로 본다.
4. `.catch()`는 모두 `blocked`로 묶어서 실제 실패 원인을 잃는다.

실기기 iPad Safari에서는 권한이 허용돼도 스트림 전환, 포커스, 프레임 디코드 과정에서 일시적 예외가 발생할 수 있는데, 현재 구현은 그걸 복구 가능한 상태로 취급하지 않는다.

#### 해결 방향

이 이슈는 현재 코드만으로 100% 단정할 수는 없지만, 현 구조상 Safari에서 오작동할 가능성이 높다. 따라서 아래처럼 상태 머신을 분리하는 것이 맞다.

권장 플로우:

1. `navigator.mediaDevices.getUserMedia()`로 먼저 권한과 스트림 확보를 분리한다.
2. 모바일 계열은 `facingMode: { ideal: "environment" }`로 후면 카메라를 우선 요청한다.
3. 스트림 확보 성공 시에만 비디오 element에 연결한다.
4. ZXing 디코드 루프에서는 `NotFound`, `Checksum`, `Format` 계열 오류를 비치명으로 무시한다.
5. 실제 `NotAllowedError`, `NotReadableError`, `AbortError` 같은 장치 수준 실패만 `blocked` 또는 `error`로 노출한다.
6. unmount 시 `controls.stop()`뿐 아니라 `MediaStreamTrack.stop()`도 명시적으로 호출한다.

즉, "카메라 사용 가능 여부"와 "이번 프레임에서 QR을 못 읽음"을 다른 상태로 다뤄야 한다.

#### 실기기 확인 항목

- iPad Safari에서 첫 진입 시 권한 팝업 후 `ready`로 올라오는지
- 후면 카메라가 선택되는지
- QR이 프레임에 없어도 `카메라 오류`가 아니라 `스캔 준비` 상태를 유지하는지
- 화면 복귀/재진입 후 이전 스트림이 제대로 정리되는지

### 3.4 검표 완료 UI 배경 대비가 나쁘고 `Ticket verified`가 그대로 보이는 문제

#### 현재 원인

`ScanResultPanel.tsx`는 결과 패널 배경을 성공/실패 색으로 직접 칠한다.

`scan.func.ts`

```ts
panelClassName: "border-... bg-[color:color-mix(...var(--success)...)]"
```

이 방식은 화면 하단 결과 패널 전체를 상태색으로 물들이기 때문에 텍스트 대비가 쉽게 무너진다. 사용자가 말한 "배경이 일부러 성공색이라 글씨가 안 보임"과 일치한다.

추가로 `ScanResultPanel.tsx`는 제목 문구에서 번역된 결과보다 백엔드 영문 메시지를 우선 노출한다.

```tsx
<p>{result.message || translatedResultLabel}</p>
```

백엔드 성공 메시지는 현재 `Ticket verified`다.

즉 문제는 두 개다.

1. 상태색 배경 남용
2. 영문 서버 메시지를 그대로 보여주는 우선순위

#### 해결 방향

결과 패널은 "배경은 중립, 상태는 아이콘/칩/테두리로만 표현"이 맞다.

권장안:

1. 성공/실패 모두 패널 본체는 `surface-raised` 또는 `surface-muted` 기반 중립 배경으로 통일
2. 상태 표현은 아래 3개만 색을 준다
   - 좌측 원형 아이콘
   - 상태 칩
   - 얇은 테두리 또는 상단 accent
3. 본문 첫 줄은 항상 번역된 상태명 우선
4. 백엔드 `message`는 화면용 primary copy가 아니라 보조 설명 또는 로그성 정보로만 사용

추천 노출 우선순위:

- 1줄: `검표 성공`, `이미 사용된 티켓`, `유효하지 않은 토큰`
- 2줄: `티켓 번호`, `검표 시각`
- 서버 영문 `message`는 기본 UI에서는 숨김

#### 테스트 보강

- 성공/실패 결과 패널이 모두 중립 배경 클래스인지
- 성공 시 `Ticket verified` 대신 번역된 `검표 성공`이 보이는지
- 장문 메시지에서도 텍스트 대비가 유지되는지

### 3.5 수동 토큰 입력 후 인풋이 비워지지 않는 문제

#### 현재 원인

`useTicketValidation.hooks.ts`에서 `setQrToken("")`은 성공 결과일 때만 호출된다.

```ts
if (data.result === "SUCCESS") {
    setQrToken("");
}
```

그래서 실패, 중복 사용, 잘못된 티켓, 네트워크 오류에서는 수동 입력값이 그대로 남는다.

#### 해결 방향

수동 입력 경로에서는 결과와 무관하게 입력창을 비우는 것이 맞다.

권장 동작:

- `source === "manual"`이면 성공/실패/네트워크 오류 후 모두 `setQrToken("")`
- 그 다음 `manualInputRef.current?.focus()`로 포커스 복귀
- 카메라 스캔 경로는 기존처럼 토큰을 별도 state에 남기지 않아도 됨

즉 "수동 입력은 일회성 submit buffer"로 다뤄야 한다.

#### 테스트 보강

- 수동 입력 성공 후 input value가 빈 문자열인지
- `ALREADY_USED`, `INVALID`, `WRONG_TICKET`에서도 input value가 비워지는지
- 네트워크 실패 후에도 input이 비워지고 포커스가 유지되는지

### 3.6 검표 완료 후에도 재예매 또는 QR 재발급이 가능한 문제

이 항목은 실제로 두 가지 버그가 겹쳐 있다.

#### 3.6.1 뒤로 가면 다시 `예매하기`가 동작하는 문제

##### 현재 원인

`PublicBookingButton.tsx`는 응답이 `200 OK`면 무조건 성공으로 간주하고 `/reserved`로 이동한다.

```ts
if (!response.ok) {
  throw new Error("booking_failed");
}

router.push("/reserved");
```

하지만 백엔드 `TicketingService`는 실패 케이스도 HTTP 에러 대신 정상 응답 body의 `result`로 돌려준다.

예:

- `DUPLICATE_PURCHASE`
- `MAX_PER_USER_EXCEEDED`
- `SALE_CLOSED`
- `NOT_OPEN`

즉 현재 프런트는 "실패한 예매 요청"도 성공처럼 처리한다.

이게 사용자가 본 현상과 맞는다.

- 이미 동일 이벤트를 사용한 티켓이 있어 재예매가 막혀도
- 버튼 클릭 후 프런트는 그냥 성공으로 보고 이동한다

##### 해결 방향

즉시 수정:

1. `PublicBookingButton`에서 `response.json()`을 읽고 `body.result === "SUCCESS"`인지 확인
2. `SUCCESS`가 아니면 라우팅하지 말고 결과 코드를 사용자 문구로 매핑
3. `DUPLICATE_PURCHASE`는 단순 generic error가 아니라 명시적 안내로 바꾼다

추천 문구:

- `이미 예매한 티켓입니다.`
- 사용 완료 티켓을 다시 시도한 경우: `이미 사용된 티켓이어서 다시 예매할 수 없습니다.`

마지막 문구까지 정확히 내려면 후속으로 "현재 사용자와 이벤트 조합의 예약 상태"를 조회하는 경량 endpoint를 두는 것이 좋다.

##### 테스트 보강

- `result: DUPLICATE_PURCHASE` 응답에서 `/reserved`로 이동하지 않는지
- `SALE_CLOSED`, `NOT_OPEN`도 성공 라우팅하지 않는지
- 실패 결과 코드별 사용자 문구가 정상 매핑되는지

#### 3.6.2 사용 완료 티켓에 대해 QR 재발급이 가능한 문제

##### 현재 원인

`ReservedQrPage`는 마운트 시와 만료 10초 전마다 항상 `/api/reservations/{reservationId}/qr-token`을 다시 호출한다.

반면 `TicketVerificationService.issueReservationQrToken()`은 현재 아래 조건만 본다.

- 예약이 존재하는지
- 요청 사용자가 소유자인지

즉 `USED`, `EXPIRED`, `BEFORE_SERVING` 여부를 검사하지 않는다.

그래서 이미 검표 완료된 티켓도 새 QR 토큰을 계속 발급할 수 있다. 검표 API에서 최종적으로 `ALREADY_USED`를 반환하더라도, 토큰 발급 자체가 허용되는 것은 UX와 보안 면에서 모두 좋지 않다.

##### 해결 방향

백엔드에서 토큰 발급 자체를 상태 기반으로 차단해야 한다.

권장 정책:

- `NOW_SERVING`에서만 QR 토큰 발급 허용
- `BEFORE_SERVING`은 `409 NOT_OPEN`
- `USED`는 `409 ALREADY_USED`
- `EXPIRED`는 `410 EXPIRED`

구현은 `validateTicketByQr()`와 같은 `resolveUsageStatus()` 규칙을 재사용하면 된다.

프런트도 함께 바꿔야 한다.

1. `ReservedQrPage`는 terminal 상태 응답을 받으면 자동 재발급 타이머를 멈춘다.
2. QR 이미지를 숨기고 상태 안내 카드로 바꾼다.
3. `QR 다시 발급` 버튼은 disabled 또는 `예약 목록으로 돌아가기`로 치환한다.

##### 테스트 보강

- `USED` 티켓은 QR 토큰 발급이 거부되는지
- 거부된 응답에서 프런트가 더 이상 자동 refresh를 돌리지 않는지
- 직접 URL 진입(`/reserved/{id}`) 시에도 QR 대신 상태 안내가 보이는지

## 4. 권장 작업 순서

### Track A. 공개 예매 신뢰성

1. 공개 이미지 조회 엔드포인트 분리
2. `PublicBookingButton` 결과 코드 해석
3. 이벤트 상세 문구/중복 메타 정리

완료 기준:

- 비로그인 사용자도 이벤트 이미지가 정상 노출된다.
- 예매 실패 결과가 성공처럼 처리되지 않는다.
- 상세 페이지에서 중복 메타가 사라지고 문장이 자연스럽다.

### Track B. 검표 화면 신뢰성

1. 수동 입력 submit 후 input 초기화
2. 결과 패널 중립 배경 리디자인
3. 서버 영문 메시지 우선 노출 제거
4. iPad Safari용 카메라 상태 머신 재구성

완료 기준:

- 수동 검표 반복이 매끄럽다.
- 성공/실패 패널 가독성이 유지된다.
- iPad Safari에서도 권한 허용 후 즉시 `카메라 오류`로 떨어지지 않는다.

### Track C. 사용 완료 티켓 재진입 차단

1. QR 발급 API에 상태 검사 추가
2. `ReservedQrPage` terminal 상태 UI 추가
3. 필요 시 이벤트 상세에서 기존 예약 상태를 미리 조회해 CTA 사전 차단

완료 기준:

- 사용 완료 티켓은 QR 재발급이 되지 않는다.
- 직접 URL 재진입 시에도 더 이상 유효한 QR이 나오지 않는다.
- 이미 예매 불가한 상황에서 `예매하기`가 성공처럼 동작하지 않는다.

## 5. 최종 정리

이번 6건은 전부 별개처럼 보이지만, 실제로는 "운영자 전용 흐름과 공개 사용자 흐름의 경계가 약한 문제"와 "결과 코드를 프런트가 끝까지 해석하지 않는 문제"로 묶인다.

즉 먼저 고쳐야 하는 것은 단순 스타일이 아니라 아래 세 가지다.

1. 공개 리소스와 비공개 리소스의 경계 재정의
2. 예매/검표 응답 결과를 화면 상태로 정확히 매핑
3. 모바일 Safari 카메라 플로우를 권한/스트림/디코드 단계로 분리

이 기준으로 진행하면 사용자가 제보한 6개 증상을 각각 땜질하지 않고, 같은 계열의 재발 이슈도 같이 줄일 수 있다.
