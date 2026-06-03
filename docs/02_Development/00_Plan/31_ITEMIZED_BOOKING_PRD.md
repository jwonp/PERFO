# PERFO Itemized Booking PRD

작성일: 2026-05-29
상태: Draft v1

## 1. 개요

PERFO의 기존 티켓팅 구조 위에 `여러 항목을 미리 담아두고`, 판매 시작 시점에 `한 번에 예매 확정`하는 기능을 추가한다.

주요 대상 시나리오는 다음과 같다.

- 한 부스에서 여러 굿즈를 예약 판매
- 운영자가 한 판매 이벤트 안에 여러 판매 항목을 등록
- 사용자가 판매 시작 전 원하는 항목과 수량을 미리 선택
- 판매 시작 후 기존 티켓팅처럼 예매 버튼을 눌러 선착순 확정

이 기능은 기존 `이벤트 1개 + 수량(quantity)` 중심 모델을 확장해, `이벤트 1개 + 항목 여러 개 + 항목별 수량` 모델을 지원하는 것이 핵심이다.

---

## 2. 문제 정의

현재 PERFO의 티켓팅 구조는 아래 전제를 가진다.

- 이벤트 단위로만 판매
- 요청 payload는 사실상 `eventId + quantity`
- 재고는 `event.remainingQuantity` 하나로 관리
- 성공 결과는 `티켓 여러 장` 기준으로 저장
- 판매 전 사용자 초안(draft) 저장 개념 없음

이 구조에서는 아래 요구를 만족하기 어렵다.

- 여러 굿즈를 서로 다른 수량으로 동시에 선택
- 판매 시작 전 선택 상태 저장
- 판매 시작 후 저장된 구성 그대로 예매
- 재고 부족 시 어떤 항목이 부족했는지 상세 응답
- 항목별 1인당 수량 제한

---

## 3. 목표

### 3.1 제품 목표

- 운영자가 하나의 판매 이벤트 아래 여러 판매 항목을 등록할 수 있어야 한다.
- 사용자는 판매 시작 전에도 항목과 수량을 선택해 저장할 수 있어야 한다.
- 사용자는 판매 시작 시 저장된 구성 그대로 예매를 시도할 수 있어야 한다.
- 서버는 항목별 재고와 항목별 구매 제한을 검증해야 한다.
- 재고 부족 시 부족 항목 정보를 포함한 실패 응답을 제공해야 한다.

### 3.2 기술 목표

- 기존 SIMPLE 티켓팅 흐름을 깨지 않고 ITEMIZED 판매 모드를 추가한다.
- draft 저장과 실제 재고 차감을 분리한다.
- itemized 주문도 idempotency, outbox, projection 흐름 안에서 처리한다.
- 동시 요청에서도 항목별 초과 판매가 발생하지 않아야 한다.

---

## 4. 비목표

이번 범위에 포함하지 않는다.

- 결제 시스템 연동
- 비회원 draft 저장
- 실시간 재고 선점
- 부분 성공 주문
- 쿠폰, 할인, 번들 프로모션
- 복합 옵션 조합(색상/사이즈 2차 옵션 체계)

---

## 5. 핵심 정책

### 5.1 담기와 예매 확정 분리

- `담기`는 판매 시간과 무관하게 가능
- `담기` 시점에는 재고 차감 없음
- `예매 확정` 시점에만 재고 차감

### 5.2 재고 부족 처리

- 항목 중 하나라도 재고 부족이면 전체 요청 실패
- 부분 성공은 허용하지 않음
- 실패 응답에는 부족 항목 목록과 가용 수량 포함

### 5.3 초안 저장 정책

- draft는 로그인 사용자 기준 이벤트별 1개
- 판매 시작 전/후 모두 수정 가능
- draft는 재고 보장을 의미하지 않음
- 예매 확정 성공 후에도 draft를 유지한다 (재고 부족 실패 후 수정 재시도 지원)
- stale draft 정리를 위해 이벤트 종료 후 30일 TTL cleanup을 적용한다

### 5.4 판매 모드 정책

- `SIMPLE`
  - 현재 티켓팅 방식 유지
- `ITEMIZED`
  - 여러 항목 + 항목별 수량 선택 지원

---

## 6. 사용자

### 6.1 운영자

- itemized 판매 이벤트 생성
- 판매 항목 등록/수정/비활성화
- 항목별 총 재고 설정
- 항목별 1인당 최대 수량 설정
- 판매 시간 설정

### 6.2 구매자

- 판매 이벤트 상세 진입
- 항목별 수량 선택
- draft 저장
- 판매 시작 시 예매 확정
- 예매 결과 확인

---

## 7. 대표 시나리오

### 시나리오 A. 판매 전 미리 담기

1. 사용자가 굿즈 판매 이벤트 상세에 진입한다.
2. 포토카드 2개, 키링 1개, 포스터 1개를 선택한다.
3. 저장 버튼 또는 자동 저장으로 draft가 저장된다.
4. 사용자는 판매 시작 전까지 수량을 자유롭게 바꿀 수 있다.

### 시나리오 B. 판매 시작 후 예매 확정

1. 판매 시작 시 사용자가 상세 화면에서 예매 버튼을 누른다.
2. 서버가 요청의 items payload를 읽는다 (draft는 클라이언트 UX용이며 서버는 payload를 진실의 원천으로 사용).
3. 서버가 판매 가능 시간, 항목 활성 상태, 항목별 재고, 항목별 제한을 검증한다.
4. 모든 항목이 가능하면 주문 생성 및 재고 차감 후 성공 응답을 반환한다.

### 시나리오 C. 재고 부족 실패

1. 사용자가 포토카드 3개, 키링 2개를 담아놓았다.
2. 판매 시작 후 예매를 시도했지만 키링 재고가 1개만 남아 있다.
3. 전체 주문은 실패한다.
4. 응답에는 `키링 요청 2 / 가용 1` 같은 부족 정보가 포함된다.
5. 사용자는 draft를 수정해 다시 시도한다.

---

## 8. UX 원칙

- 판매 전 담기 UX는 “장바구니”보다는 “확정 예정 구성”에 가깝게 보여야 한다.
- 사용자는 판매 시작 시 수량을 다시 입력하지 않아도 돼야 한다.
- 재고 부족 시 무엇을 얼마나 줄여야 하는지 즉시 이해할 수 있어야 한다.
- 기존 PERFO 티켓 상세 UI를 크게 벗어나지 않아야 한다.
- 모바일 우선으로 설계한다.
- 운영자가 항목을 비활성화한 경우, 해당 항목은 draft 복원 시 자동으로 제외하고 "판매 종료된 항목" 안내와 함께 표시한다. DTO 조합 시점에 `active=false` 항목을 필터링한다.

---

## 9. 기능 요구사항

### 9.1 운영자 기능

- 판매 이벤트 생성 시 `bookingMode` 선택 가능
- `ITEMIZED` 선택 시 판매 항목 목록 등록 가능
- 각 항목은 아래 필드를 가진다.
  - 이름
  - 설명
  - 이미지(optional)
  - 총 재고
  - 남은 재고
  - 1인당 최대 수량
  - 활성 상태
  - 정렬 순서

### 9.2 구매자 기능

- 이벤트 상세에서 항목 목록을 볼 수 있어야 한다.
- 항목별 수량을 선택할 수 있어야 한다.
- 현재 선택 상태를 저장/복원할 수 있어야 한다.
- 저장된 선택 상태를 기준으로 예매 확정할 수 있어야 한다.

### 9.3 서버 기능

- draft 저장/조회 API 제공
- itemized 주문 확정 API 제공
- 항목별 재고/제한 검증
- 부족 항목 상세 응답 제공
- 성공 시 주문 헤더 + 주문 항목 저장
- 기존 outbox/projection 흐름 연동

---

## 10. 도메인 모델 제안

### 10.1 기존 엔티티 확장

#### `IssuedTicket`

- `bookingMode` 추가
  - `SIMPLE`
  - `ITEMIZED`

#### `Event`

- `bookingMode` 반영
- SIMPLE에서는 기존 `remainingQuantity` 유지
- ITEMIZED에서는 요약 정보 또는 계산용 값으로만 사용

### 10.2 신규 엔티티

#### `EventItem`

판매 이벤트 하위 항목

- `id`
- `eventId`
- `name`
- `description`
- `imageUrl`
- `price` (optional, 표시용 — 결제 연동과 무관)
- `totalQuantity`
- `remainingQuantity`
- `maxPerUser`
- `active`
- `sortOrder`

#### `BookingDraft`

사용자 이벤트별 초안 헤더

- `id`
- `eventId`
- `userId`
- `version`
- `updatedAt`

#### `BookingDraftItem`

초안 항목별 수량

- `id`
- `draftId`
- `eventItemId`
- `quantity`

#### `BookingOrder`

성공 주문 헤더

- `id`
- `eventId`
- `userId`
- `requestId`
- `status`
- `createdAt`

#### `BookingOrderItem`

성공 주문 항목별 수량

- `id`
- `orderId`
- `eventItemId`
- `itemNameSnapshot`
- `quantity`

#### `TicketingPurchaseProjection` 확장

기존 projection 테이블에 아래 컬럼을 추가한다.

- `bookingMode` (`SIMPLE` / `ITEMIZED`)
- `orderItems` (JSON, ITEMIZED 전용 — `[{eventItemId, itemName, quantity}]`)

SIMPLE 모드는 기존 컬럼 그대로 사용. ITEMIZED는 `orderItems`에 항목별 스냅샷 저장.

---

## 11. 데이터 저장 원칙

- draft와 order는 분리 저장한다.
- draft는 덮어쓰기 가능해야 한다.
- order는 성공 시점 스냅샷을 저장해야 한다.
- 항목 이름/설명이 나중에 바뀌어도 과거 주문은 보존되어야 한다.
- itemized 주문은 기존 `tickets` 테이블에 억지로 끼워넣지 않는다.
- 기존 `tickets` 테이블은 SIMPLE 모드 호환을 위해 유지한다.

---

## 12. API 방향

### 12.1 이벤트 상세

`GET /api/events/{eventId}`

- `bookingMode=ITEMIZED`인 경우 항목 목록 포함
- 항목별 남은 수량, 제한 포함

### 12.2 draft 조회

`GET /api/events/{eventId}/draft`

응답 예시:

```json
{
  "eventId": 11,
  "version": 3,
  "items": [
    { "eventItemId": 101, "quantity": 2 },
    { "eventItemId": 102, "quantity": 1 }
  ]
}
```

### 12.3 draft 저장

PUT /api/events/{eventId}/draft

요청 예시:

```json
{
  "items": [
    { "eventItemId": 101, "quantity": 2 },
    { "eventItemId": 102, "quantity": 1 }
  ]
}
```

검증 규칙:

- `items`는 비어 있을 수 없다 (최소 1개)
- 각 항목의 `quantity`는 1 이상이어야 한다 (0 불허)
- 수량 0을 원하면 해당 항목을 목록에서 제거해 전송한다

### 12.4 예매 확정

기존 POST /api/ticketing/requests 확장

요청 예시:

```json
{
  "requestId": "req_itemized_0001",
  "eventId": 11,
  "items": [
    { "eventItemId": 101, "quantity": 2 },
    { "eventItemId": 102, "quantity": 1 }
  ]
}
```

`selectionVersion`은 사용하지 않는다. items 배열 자체가 idempotency 검증 원천이다.

### 12.5 실패 응답

```json
{
  "requestId": "req_itemized_0001",
  "eventId": 11,
  "result": "INSUFFICIENT_ITEM_INVENTORY",
  "message": "Insufficient inventory",
  "shortages": [
    {
      "eventItemId": 102,
      "requestedQuantity": 2,
      "availableQuantity": 1
    }
  ]
}
```

ITEMIZED 모드 추가 결과값:

- `INSUFFICIENT_ITEM_INVENTORY` — 항목 재고 부족
- `ITEM_INACTIVE` — 비활성화된 항목 포함
- `ITEM_MAX_PER_USER_EXCEEDED` — 항목별 1인 구매 제한 초과

---

## 13. 트랜잭션 정책

예매 확정 시 서버는 아래 순서를 따른다.

1. requestId idempotency 확인
2. ledger PROCESSING 생성
3. event SELECT FOR SHARE (active/saleOpenAt/saleCloseAt 읽기용 — 쓰기 경합 없음. ITEMIZED는 event.remainingQuantity 차감 안 함)
4. 필요한 event_item row lock (FOR UPDATE — 재고 차감 대상)
5. 판매 가능 시간 검증
6. 항목 활성 상태 검증
7. 항목별 재고 검증
8. 사용자 누적 구매량 검증 (ITEMIZED: `BookingOrderItem` 집계 기준. SIMPLE: 기존 `tickets` 테이블 기준)
9. 주문 헤더/주문 항목 저장
10. 항목 재고 차감
11. ledger COMPLETE 저장
12. outbox 저장
13. 응답 반환

모든 단계는 하나의 트랜잭션 안에서 수행한다.

---

## 14. idempotency 정책

현재 구조는 eventId + quantity 정도만 비교한다.
ITEMIZED에서는 아래까지 동일해야 같은 요청으로 간주한다.

- eventId
- items[eventItemId, quantity] 배열 (순서 무관, 내용 비교)

`selectionVersion`은 사용하지 않는다. items 배열 자체를 ledger에 스냅샷으로 저장해 재시도 시 비교한다.
같은 requestId에 대해 payload가 다르면 에러를 반환한다.

---

## 15. 결과 화면 정책

### 15.1 reserved 화면

- itemized 주문은 주문 1건 단위로 노출
- 카드 안에 주문 항목 요약 포함
- 예:
    - 포토카드 x2
    - 키링 x1

### 15.2 QR 정책

이번 단계에서는 두 가지 방향 중 하나를 선택 가능하게 열어둔다.

- 옵션 A. 주문 1건당 QR 1개
- 옵션 B. 굿즈 예약은 QR 없이 상태 확인만 제공

기술 설계는 두 방향 모두 수용 가능하게 간다.

---

## 16. 단계별 구현 계획

### Phase 1. 판매 모드 및 항목 모델 추가

범위:

- bookingMode 도입
- EventItem 테이블 및 CRUD 추가
- 운영자 발급 폼에 itemized 모드와 항목 편집 추가

목표:

- 운영자가 itemized 판매 이벤트를 만들 수 있어야 한다.

### Phase 2. draft 저장 기능 추가

범위:

- 이벤트 상세 항목 UI
- draft 조회/저장 API
- 사용자별 이벤트 draft 복원

목표:

- 사용자가 판매 전 선택 구성을 저장하고 다시 이어갈 수 있어야 한다.

### Phase 3. itemized 주문 확정 트랜잭션 추가

범위:

- itemized request payload 처리
- 항목 재고 차감
- 부족 항목 실패 응답
- ledger/outbox/projection 확장

목표:

- 판매 시작 후 실제 주문을 안전하게 확정할 수 있어야 한다.

### Phase 4. 예약 결과 화면 확장

범위:

- reserved 화면에 itemized 주문 요약 노출
- 필요 시 QR 정책 반영

목표:

- 구매자가 자신이 무엇을 예약했는지 명확히 확인할 수 있어야 한다.

### Phase 5. 운영자 통계 및 관리 확장

범위:

- 항목별 판매 수량
- 품절 항목 현황
- 실패 원인 집계

목표:

- 운영자가 itemized 판매 상태를 쉽게 관리할 수 있어야 한다.

---

## 17. 테스트 전략

### 17.1 백엔드 단위 테스트

- 판매 시작 전 draft 저장 가능
- itemized 요청 성공 시 주문 생성
- item별 재고 부족 시 전체 실패
- item별 maxPerUser 초과 시 실패
- 같은 requestId 재시도 시 같은 응답 반환
- 다른 payload로 같은 requestId 재사용 시 에러

### 17.2 백엔드 동시성 테스트

- 동일 item 재고에 대한 동시 주문에서도 초과 판매 없음
- 여러 item 조합 주문에서도 전체 일관성 유지

### 17.3 프론트 테스트

- 이벤트 상세에서 항목 수량 입력 가능
- draft 저장 및 복원 가능
- 부족 항목 에러 메시지 렌더링
- 성공 후 reserved에 항목 요약 표시

### 17.4 E2E

- 운영자 itemized 이벤트 생성
- 구매자 판매 전 담기
- 판매 시작 후 예매 확정
- 재고 부족 시 수정 후 재시도

---

## 18. 리스크

- 기존 tickets 중심 모델과 itemized order 모델이 병행된다.
- reserved와 QR 흐름이 티켓 번호 중심이라 UI 재설계가 필요하다.
- projection/outbox payload가 커진다.
- 향후 부분 성공 요구가 추가되면 현재 설계를 다시 나눠야 할 수 있다.
- 이벤트 레벨 재고와 항목 레벨 재고를 동시에 보여줄 때 혼동이 생길 수 있다.

---

## 19. 오픈 질문

- itemized 주문에 QR이 필요한가
- 굿즈 수령 검증이 필요한가
- 부분 성공을 장기적으로 열어둘 것인가
- 이벤트 전체 단위 maxPerUser도 필요한가
- draft를 자동 저장할 것인가, 명시 저장할 것인가
- 비회원 draft 저장은 장기 과제로 둘 것인가

---

## 20. 성공 기준

- 운영자가 여러 판매 항목을 등록할 수 있다.
- 사용자가 판매 시작 전 항목과 수량을 담아둘 수 있다.
- 사용자가 판매 시작 시 저장한 구성을 그대로 예매할 수 있다.
- 서버가 항목별 재고와 제한을 정확히 검증한다.
- 부족 시 부족 항목 정보가 사용자에게 명확히 표시된다.
- 동시 요청 상황에서도 초과 판매가 발생하지 않는다.
```
