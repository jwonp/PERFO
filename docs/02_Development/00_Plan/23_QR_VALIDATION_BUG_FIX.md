# QR 검표 INVALID 오류 수정

> 관련 코드:
> `backend/src/main/kotlin/com/perfo/backend/service/TicketVerificationService.kt`
> `backend/src/main/kotlin/com/perfo/backend/service/QrSignatureService.kt`
> `frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx`

## 1. 문제 상황

티켓 등록 후 QR을 발급했는데 즉시 아래 응답이 반환된다.

```json
{
  "result": "INVALID",
  "message": "Invalid or expired QR token"
}
```

발급 자체는 정상이었는데 검증 시 INVALID.

## 2. 원인 분석 (버그 2개)

### 버그 1: QR 토큰 자동 갱신 없음 (직접 원인)

`ReservedQrPage`는 컴포넌트 마운트 시 토큰을 한 번만 발급한다.  
`QrSignatureService.issueToken`의 기본 TTL은 **60초**다.

사용자가 QR 페이지에 60초 이상 머물면 토큰이 만료된다. 수동 "새로고침" 버튼은 있지만 자동 갱신 로직이 없었다.

문제가 된 토큰 분석:
- `expiresAtEpochSecond: 1779387053`
- 검증 시점 epoch: `1779387363`
- 만료 경과: **310초** (발급 후 약 6분 뒤에 검증 시도)

### 버그 2: 잘못된 namespace 비교 (로직 버그)

`TicketVerificationService.validateTicketByQr` 내부 비교:

```kotlin
// 수정 전 (잘못된 비교)
if (payload.eventId != ticketId) { ... }
```

- `ticketId`: 경로 파라미터 → `POST /api/tickets/{ticketId}/validations`의 **issuedTicketId**
- `payload.eventId`: QR 페이로드의 **eventId**

두 값은 완전히 다른 namespace다. 예시 토큰에서 `payload.eventId=7`, `ticketId=issuedTicketId`로 비교 자체가 무의미하다.

올바른 검사는 이벤트를 조회한 뒤 `event.issuedTicketId != ticketId`로 확인해야 한다.

## 3. 수정 내용

### 버그 1 수정: 프론트엔드 자동 갱신

`ReservedQrPage`에 `expiresAt` 기반 자동 갱신 `useEffect` 추가.

만료 10초 전에 `loadToken()`을 다시 호출한다. 토큰이 갱신되면 새 `expiresAt`으로 타이머가 재설정된다.

```typescript
useEffect(() => {
    if (!data?.expiresAt) return;

    const expiresAtMs = new Date(data.expiresAt).getTime();
    const delayMs = expiresAtMs - Date.now() - 10_000;

    if (delayMs <= 0) {
        void loadToken();
        return;
    }

    const timer = setTimeout(() => void loadToken(), delayMs);
    return () => clearTimeout(timer);
}, [data?.expiresAt]);
```

### 버그 2 수정: 백엔드 비교 로직

`TicketVerificationService.kt`에서 잘못된 조기 비교를 제거하고, 이벤트 조회 이후에 `event.issuedTicketId != ticketId` 비교로 교체.

```kotlin
// 수정 전: 조기에 잘못된 namespace 비교
if (payload.eventId != ticketId) { ... }

// 수정 후: 이벤트 조회 후 올바른 비교
val event = eventRepository.findById(reservation.eventId)...
if (event.issuedTicketId != ticketId) {
    return WRONG_TICKET
}
```
