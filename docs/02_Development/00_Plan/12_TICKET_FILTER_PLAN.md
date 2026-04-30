# 사용 완료 티켓 표시와 중복 구매 허용 필터 구현 계획

> 기준 파일:
> `frontend/app/[locale]/(main)/reserved/page.tsx`
> `frontend/app/[locale]/(main)/reserved/__tests__/ReservedPage.test.tsx`
> `frontend/app/[locale]/(main)/my-tickets/page.tsx`
> `frontend/app/[locale]/(main)/my-tickets/__tests__/MyTicketsPage.test.tsx`
> `backend/src/main/kotlin/com/perfo/backend/dto/TicketDto.kt`
> `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
>
> 이 문서는 예약 티켓 화면의 `사용 완료만 보기`와 발급 티켓 화면의 `중복 구매 허용` 필터를 실제 사용자 관점에서 일관되게 동작하도록 정리하는 구현 계획이다.

## 1. 목표

- 예약 티켓 화면에서 사용 완료 티켓만 명확하게 걸러 볼 수 있다.
- 발급 티켓 화면에서 `중복 구매 허용` 여부로 티켓을 필터링할 수 있다.
- 필터 UI는 모바일 화면에서 직관적이고, 현재 선택 상태가 명확해야 한다.
- 1차 구현은 현재 응답 데이터를 재사용하는 클라이언트 필터로 빠르게 완성한다.
- 티켓 수가 늘어날 경우를 대비해 2차 서버 필터 확장 지점도 함께 정리한다.

## 2. 현재 상태

### 2.1 예약 티켓 화면

- `frontend/app/[locale]/(main)/reserved/page.tsx`에는 `showUsedOnly` 상태가 있다.
- `사용 완료` 탭을 누르면 `usageStatus === "USED"`만 남기는 필터 로직도 있다.
- `frontend/app/[locale]/(main)/reserved/__tests__/ReservedPage.test.tsx`에도 해당 탭 동작 테스트가 이미 있다.
- 하지만 같은 영역에 `사용 완료만 보기` 버튼이 따로 있고, 이 버튼은 현재 아무 동작도 하지 않는다.
- 즉 기능은 일부 있지만 UI가 중복되어 있고, 사용자는 어느 컨트롤이 실제 필터인지 헷갈릴 수 있다.

### 2.2 발급 티켓 화면

- `frontend/app/[locale]/(main)/my-tickets/page.tsx`에는 `중복 구매 허용` 버튼이 있다.
- 하지만 별도 필터 상태가 없고 `tickets.map(...)` 전에 필터링도 하지 않는다.
- 테스트도 `allowDuplicate` 값 렌더링만 확인할 뿐, 필터 상호작용은 검증하지 않는다.
- 백엔드 응답에는 이미 `allowDuplicate` 필드가 포함되어 있어, 프론트만으로도 1차 필터 구현이 가능하다.

## 3. 범위

이번 계획의 범위:

1. 예약 티켓 화면의 `사용 완료만 보기` UX 정리
2. 발급 티켓 화면의 `중복 구매 허용` 필터 실제 구현
3. 관련 다국어 메시지와 테스트 보강

초기 범위에서 제외:

- 검색어와 필터의 복합 조합
- 필터 상태의 URL 동기화
- 서버 쿼리 기반 대용량 필터
- 관리자 통계용 고급 필터

## 4. 핵심 결정

### 4.1 1차는 클라이언트 필터로 구현한다

- 예약 티켓은 이미 `usageStatus`를 내려받고 있다.
- 발급 티켓은 이미 `allowDuplicate`를 내려받고 있다.
- 현재 목록 규모와 화면 구조를 보면 별도 서버 필터 없이도 즉시 구현 가능하다.

이유:

- 변경 범위가 프론트와 테스트에 집중되어 빠르게 마무리할 수 있다.
- API 계약을 바꾸지 않아도 된다.
- 필터 UX를 먼저 확정한 뒤, 실제 데이터 규모가 커지면 서버 필터로 옮기기 쉽다.

### 4.2 필터는 버튼 하나보다 명시적 2-3상태 선택 UI가 낫다

권장안:

- 예약 티켓: `전체 / 사용 완료`
- 발급 티켓: `전체 / 중복 허용 / 중복 미허용`

이유:

- 단순 토글 하나로는 현재 무엇이 선택된 상태인지 덜 명확하다.
- `중복 허용만 보기`만 있으면 반대로 `중복 미허용만 보기`는 빠르게 볼 수 없다.
- 현재 `Tabs` 컴포넌트를 이미 예약 티켓 화면에서 쓰고 있어 패턴 재사용이 가능하다.

### 4.3 필터 컨트롤은 페이지 제목 대용 버튼이 아니라 실제 상태 선택기로 사용한다

- `my-tickets`의 현재 첫 번째 버튼은 페이지 제목을 반복하는 수준이라 정보가 없다.
- `PageFilterBar`는 실제 필터 상태를 보여주는 컨트롤만 남기는 편이 낫다.

## 5. 예약 티켓 화면 계획

### 5.1 UX 정리

대상 파일:

- `frontend/app/[locale]/(main)/reserved/page.tsx`

변경 방향:

- `전체 / 사용 완료` 탭을 실제 필터 컨트롤로 유지한다.
- 동작하지 않는 `사용 완료만 보기` outline 버튼은 제거하거나, 탭과 완전히 같은 상태를 공유하도록 바꾼다.
- 권장안은 중복 UI 제거다.

### 5.2 필터 상태 모델

후보:

```ts
type ReservedTicketFilter = "ALL" | "USED";
```

현재 `showUsedOnly: boolean`도 가능하지만, 이후 `사용 가능`, `대기중` 같은 확장 여지를 생각하면 union 타입이 더 낫다.

### 5.3 빈 상태 분리

현재는 필터가 걸린 빈 결과와 전체 데이터가 없는 상태를 같은 메시지로 보여준다.

권장안:

- 전체 목록이 비었을 때: `예약한 티켓이 없습니다`
- 사용 완료 필터 결과가 비었을 때: `아직 사용 완료된 티켓이 없습니다`

## 6. 발급 티켓 화면 계획

### 6.1 UX 방향

대상 파일:

- `frontend/app/[locale]/(main)/my-tickets/page.tsx`
- `frontend/app/[locale]/(main)/my-tickets/my-tickets.types.ts`

권장 필터:

- `전체`
- `중복 허용`
- `중복 미허용`

후보 타입:

```ts
type DuplicatePurchaseFilter = "ALL" | "ALLOW_DUPLICATE" | "NO_DUPLICATE";
```

### 6.2 필터 로직

권장 구현:

```ts
const filteredTickets = tickets.filter((ticket) => {
    switch (duplicateFilter) {
        case "ALLOW_DUPLICATE":
            return ticket.allowDuplicate;
        case "NO_DUPLICATE":
            return !ticket.allowDuplicate;
        default:
            return true;
    }
});
```

초기에는 목록 fetch 이후 메모리 배열 기준으로 필터링한다.

### 6.3 빈 상태 분리

권장 메시지:

- 전체가 비었을 때: `발급한 티켓이 없습니다`
- `중복 허용` 필터 결과가 없을 때: `중복 구매를 허용한 티켓이 없습니다`
- `중복 미허용` 필터 결과가 없을 때: `중복 구매를 제한한 티켓이 없습니다`

### 6.4 향후 확장 고려

이 필터 구조는 나중에 아래 조건을 추가하기 쉽도록 만든다.

- 상태 기준 필터 (`ISSUING`, `VERIFYING`, `EXPIRED`)
- 오픈 시간 기준 필터
- 이미지 유무 필터

## 7. API와 백엔드 계획

### 7.1 1차 구현

백엔드 변경은 필수 아님.

이유:

- 예약 목록 응답에는 이미 `usageStatus`가 있다.
- 발급 목록 응답에는 이미 `allowDuplicate`가 있다.
- 필터 구현 목적만 놓고 보면 현재 데이터 계약으로 충분하다.

### 7.2 2차 확장 옵션

목록이 커질 경우 다음 쿼리 파라미터를 추가하는 방향을 열어둔다.

예약 티켓:

```http
GET /api/reservations?usageStatus=USED
```

발급 티켓:

```http
GET /api/tickets?allowDuplicate=true
GET /api/tickets?allowDuplicate=false
```

하지만 지금 단계에서는 과하다.

권장 판단 기준:

- 클라이언트 목록 렌더링이 체감상 느려질 때
- 페이지네이션이 도입될 때
- 필터 조합이 2개 이상으로 늘어날 때

## 8. 프론트엔드 작업 계획

### 8.1 예약 티켓

작업:

- `showUsedOnly`를 명확한 필터 타입으로 정리하거나 그대로 둘 경우 버튼 중복 제거
- `filtered` 결과 기준 렌더링 유지
- 필터 결과 전용 empty message 추가

파일:

- `frontend/app/[locale]/(main)/reserved/page.tsx`
- `frontend/app/[locale]/(main)/reserved/reserved.types.ts`
- `frontend/messages/ko.json`
- `frontend/messages/en.json`
- `frontend/messages/ja.json`

### 8.2 발급 티켓

작업:

- `duplicateFilter` 상태 추가
- `tickets` 대신 `filteredTickets` 렌더링
- `PageFilterBar`에 실제 필터 탭 또는 칩 추가
- 현재 제목 반복 버튼 제거

파일:

- `frontend/app/[locale]/(main)/my-tickets/page.tsx`
- `frontend/app/[locale]/(main)/my-tickets/my-tickets.types.ts`
- 필요하면 `frontend/app/[locale]/(main)/my-tickets/my-tickets.constants.ts`
- `frontend/messages/ko.json`
- `frontend/messages/en.json`
- `frontend/messages/ja.json`

## 9. 다국어 메시지 계획

예약 티켓 추가 후보:

- `reserved.emptyUsed`

발급 티켓 추가 후보:

- `myTickets.filterAll`
- `myTickets.filterAllowDuplicate`
- `myTickets.filterNoDuplicate`
- `myTickets.emptyAllowDuplicate`
- `myTickets.emptyNoDuplicate`

## 10. 테스트 계획

### 10.1 예약 티켓 테스트

대상:

- `frontend/app/[locale]/(main)/reserved/__tests__/ReservedPage.test.tsx`

추가/정리:

- `사용 완료` 필터가 `USED`만 남기는 기존 테스트 유지
- `전체`로 돌아오면 목록이 다시 보이는지 확인
- 필터된 빈 상태 메시지 확인
- 동작하지 않는 중복 버튼 제거 시 그에 맞게 테스트 정리

### 10.2 발급 티켓 테스트

대상:

- `frontend/app/[locale]/(main)/my-tickets/__tests__/MyTicketsPage.test.tsx`

추가:

- `전체`에서 전체 목록 노출
- `중복 허용` 선택 시 `allowDuplicate === true`만 노출
- `중복 미허용` 선택 시 `allowDuplicate === false`만 노출
- 필터 결과가 없을 때 전용 empty message 노출

### 10.3 E2E

후보:

- `frontend/e2e/my-tickets.spec.ts`

초기 시나리오:

1. 발급 티켓 목록 진입
2. `중복 허용` 필터 선택
3. 해당 티켓만 남는지 확인
4. `전체` 복귀 시 전체 목록 복원 확인

예약 티켓도 필요하면 후속으로 같은 패턴을 추가한다.

## 11. 구현 순서

1. 예약 티켓 필터 UI 중복 제거 또는 상태 통합
2. 발급 티켓 `duplicateFilter` 상태 추가
3. 발급 티켓 필터 렌더링과 empty state 분기 추가
4. 다국어 메시지 추가
5. 단위 테스트 보강
6. 필요 시 E2E 추가

## 12. 권장 결론

이 요구는 지금 구조상 백엔드보다 프론트 정리가 핵심이다. 예약 티켓의 `사용 완료`는 이미 필터 로직과 테스트가 있으므로 중복 UI를 걷어내고 빈 상태를 분리하면 된다. 반면 발급 티켓의 `중복 구매 허용`은 현재 버튼만 있고 실제 필터가 없으므로, `전체 / 중복 허용 / 중복 미허용` 3상태 필터를 추가하는 것이 가장 명확하다.

1차는 클라이언트 필터로 마무리하고, 나중에 데이터 규모가 커질 때만 API 쿼리 필터를 추가하는 순서가 가장 현실적이다.
