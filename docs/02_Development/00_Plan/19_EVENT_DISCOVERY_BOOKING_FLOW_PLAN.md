# 이벤트 탐색과 예매 진입 플로우 구현 계획

> 기준 문서:
> `docs/02_Development/00_Plan/01_FRONTEND_PLAN.md`
> `docs/02_Development/00_Plan/15_TICKETING_ENGINE_STABILITY_PLAN.md`
> `docs/02_Development/00_Plan/17_TICKETING_PROJECTION_CONTRACT.md`
> `frontend/app/[locale]/page.tsx`
> `frontend/app/[locale]/(main)/layout.tsx`
> `frontend/app/[locale]/(main)/reserved/page.tsx`
> `backend/src/main/kotlin/com/perfo/backend/entity/Event.kt`
>
> 이 문서는 현재 구현된 티켓팅 구매 코어를 실제 사용자 플로우로 연결하기 위해, 사용자가 어떤 이벤트를 어디서 발견하고 어떻게 예매를 시작하는지 정의하는 실행 계획이다.

## 1. 문제 정의

- 현재 시스템에는 `POST /api/ticketing/requests` 기반의 구매 코어가 있다.
- 사용자가 이미 예매한 티켓은 `reserved` 화면에서 볼 수 있고, 운영자가 발급한 티켓은 `my-tickets` 화면에서 관리할 수 있다.
- 하지만 로그인한 사용자가 “예매 가능한 이벤트를 탐색하고, 상세 정보를 보고, 예매를 시작하는 화면”은 없다.
- 지금 구조에서는 사용자가 `eventId`를 외부에서 이미 알고 있어야만 구매 API를 호출할 수 있다.

즉, 코어 엔진은 있지만 사용자 입장에서는 “무엇을 예매할 수 있는지”와 “어디서 예매를 눌러야 하는지”가 빠져 있다.

## 2. 목표

- 로그인한 사용자가 앱 안에서 예매 가능한 이벤트를 발견할 수 있다.
- 사용자가 이벤트 상세 화면에서 판매 상태, 일정, 장소, 구매 제한을 확인할 수 있다.
- 사용자가 상세 화면에서 수량을 선택하고 바로 예매 요청을 보낼 수 있다.
- 예매 성공 후 사용자는 자연스럽게 `reserved` 화면 또는 예약 상세 화면으로 이어진다.
- 운영자는 티켓 생성/수정 시 해당 티켓을 목록에 노출할지, URL 전용으로 운영할지 선택할 수 있다.
- 운영자는 생성된 티켓 예매 URL을 앱에서 바로 복사하거나 공유할 수 있다.
- 티켓팅 코어의 DB authoritative path는 유지하고, 프런트는 그 위에 얇은 탐색/진입 UX만 추가한다.

## 3. 현재 상태 정리

### 3.1 이미 있는 것

- 랜딩 페이지: `frontend/app/[locale]/page.tsx`
- 로그인 이후 메인 탭: `reserved`, `my-tickets`, `profile`
- 예약 티켓 목록: `frontend/app/[locale]/(main)/reserved/page.tsx`
- 예약 QR 상세: `frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx`
- 구매 API: `frontend/app/api/ticketing/requests/route.ts`
- 구매 엔진: `backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt`
- 이벤트 도메인 필드:
  - `name`
  - `venue`
  - `validFrom`, `validUntil`
  - `saleOpenAt`, `saleCloseAt`
  - `remainingQuantity`
  - `maxPerUser`
  - `allowDuplicate`
  - `active`

### 3.2 없는 것

- 공개 이벤트 목록 조회 API
- 공개 이벤트 상세 조회 API
- 로그인 이후 “예매하러 가는” 메인 내비게이션
- 상세 화면의 구매 CTA
- 구매 결과를 `reserved`와 연결하는 UX
- 티켓 생성 시 예매 노출 방식 설정
- URL 전용 티켓의 공유 링크 복사/공유 UX

## 4. 핵심 결정

### 4.1 사용자 예매의 시작점은 `tickets`가 아니라 `events`다

- `my-tickets`는 운영자가 발급하는 티켓 관리 화면이다.
- `reserved`는 이미 예매한 사용자의 결과 화면이다.
- 사용자가 예매를 시작하는 대상은 `events`여야 한다.

따라서 새 사용자 플로우는 `이벤트 목록 -> 이벤트 상세 -> 예매 요청 -> 예약 티켓 확인` 순서로 설계한다.

### 4.2 메인 탭에 `events`를 추가한다

현재 로그인 후 메인 레이아웃에는 `reserved`, `my-tickets`, `profile`만 있다.

이 구조에서는 사용자가 구매 이후 결과는 볼 수 있어도, 구매 전 탐색 화면으로 다시 돌아갈 수 없다.

권장안:

- 메인 하단 탭에 `events`를 추가한다.
- 초기 진입 기준 메인 홈 성격은 `events`가 맡는다.
- `reserved`는 “내가 산 티켓”, `my-tickets`는 “내가 발급한 티켓”으로 역할을 분리한다.

### 4.3 예매 노출 방식은 `LISTED`와 `LINK_ONLY` 두 가지로 나눈다

- `LISTED`
  - `events` 목록 메뉴에 노출된다.
  - 일반 사용자가 앱 안에서 탐색할 수 있다.
- `LINK_ONLY`
  - `events` 목록 메뉴에는 노출되지 않는다.
  - 운영자가 공유한 URL로만 접근할 수 있다.

핵심은 “예매 가능 여부”와 “발견 경로”를 분리하는 것이다.

- 예매 가능 여부는 기존 `saleOpenAt`, `saleCloseAt`, 재고, `active`가 결정한다.
- 발견 경로는 `discoveryMode`가 결정한다.

### 4.4 공개 URL은 항상 만들고, 노출 여부만 분리한다

- `LISTED`든 `LINK_ONLY`든 상세 진입 URL은 항상 존재해야 한다.
- `LISTED`는 목록과 상세 양쪽에서 접근 가능하다.
- `LINK_ONLY`는 목록에서 제외되고 상세 URL로만 접근 가능하다.

권장 초기안:

- 사용자 공개 경로는 `frontend/app/[locale]/(main)/events/[eventId]/page.tsx`를 재사용한다.
- 후속으로 비노출 링크의 추측 가능성을 줄이고 싶으면 `publicSlug` 기반 경로를 추가 검토한다.

즉 초기에는 새로운 비밀 링크 체계를 만들기보다, “목록 비노출 + 직접 URL 접근 허용”으로 먼저 간다.

## 5. 사용자 플로우

### 5.1 기본 플로우

1. 로그인 후 `events` 탭 진입
2. 예매 가능한 이벤트 목록 조회
3. 카드에서 제목, 장소, 일정, 판매 상태 확인
4. 이벤트 카드 클릭 후 상세 화면 진입
5. 상세 화면에서 수량 선택
6. `예매하기` 클릭
7. `POST /api/ticketing/requests` 호출
8. 결과에 따라 분기
   - `SUCCESS`: `reserved` 또는 예약 상세로 이동
   - `NOT_OPEN`: 오픈 예정 안내
   - `SALE_CLOSED`: 판매 종료 안내
   - `SOLD_OUT`: 매진 안내

### 5.2 URL 직접 진입 플로우

1. 운영자가 `my-tickets` 또는 티켓 관리 화면에서 예매 URL 복사/공유
2. 사용자가 링크를 통해 이벤트 상세로 바로 진입
3. 상세 화면에서 판매 상태 확인
4. 수량 선택 후 예매 요청
5. 결과는 기본 플로우와 동일하게 처리

이 플로우는 `LINK_ONLY` 티켓의 기본 진입 방식이다.

### 5.3 성공 후 연결

초기 구현에서는 성공 즉시 다음 중 하나로 이동하면 충분하다.

1안. `reserved` 목록으로 이동
- 구현 단순성 높음
- 기존 화면 재사용 가능

2안. 방금 생성된 예약 티켓 상세로 이동
- 사용자가 즉시 결과를 확인하기 좋음
- 다만 예약 ID 연결 계약이 더 필요함

권장 초기안:

- 우선 `reserved` 목록으로 이동
- 이후 구매 응답에서 reservation/ticket 식별자를 안정적으로 내려줄 수 있으면 상세 이동으로 확장

## 6. 화면 계획

### 6.1 이벤트 목록 화면

후보 경로:

- `frontend/app/[locale]/(main)/events/page.tsx`

필수 표시 정보:

- 이벤트명
- 장소
- 진행 일시
- 판매 상태
- 남은 수량 또는 매진 여부
- CTA

목록 노출 조건:

- `discoveryMode=LISTED`
- `active=true`
- 운영적으로 비활성화되지 않은 티켓만 표시

필터 초기안:

- 전체
- 예매 가능
- 오픈 예정
- 종료됨

초기 범위에서 제외:

- 지도 검색
- 카테고리
- 정렬 복잡화
- 추천/랭킹

### 6.2 이벤트 상세 화면

후보 경로:

- `frontend/app/[locale]/(main)/events/[eventId]/page.tsx`

필수 표시 정보:

- 이벤트명
- 장소
- 행사 시작/종료
- 판매 오픈/종료
- 총 수량 / 남은 수량
- 1인당 구매 제한
- 중복 구매 허용 여부
- 판매 상태에 따른 CTA

CTA 상태:

- `saleOpenAt` 이전: `오픈 예정`
- 판매 중: 수량 선택 + `예매하기`
- `saleCloseAt` 이후: `판매 종료`
- 잔여 수량 0: `매진`

### 6.3 예매 진행 UI

초기 구현은 별도 장시간 대기 화면 없이 간단하게 처리한다.

- 상세 화면에서 수량 선택
- `예매하기` 클릭 시 버튼 로딩
- 중복 클릭 방지를 위해 `requestId` 1회 생성
- 응답이 올 때까지 같은 요청은 재사용

이유:

- 현재 구매 코어는 최종 결과를 동기 응답으로 반환한다.
- waiting room이나 별도 queue UI는 지금 단계 범위가 아니다.

### 6.4 운영자 노출 설정과 공유 UI

대상 화면:

- `frontend/app/[locale]/(main)/my-tickets/page.tsx`

추가 UX:

- 티켓 생성/수정 시 `노출 방식` 토글
  - `목록에 노출`
  - `링크로만 공유`
- 저장 후 카드/시트에서 `예매 URL 복사` 버튼
- 지원 기기에서는 `공유` 버튼으로 Web Share API 호출
- 공유 실패 또는 미지원 환경에서는 클립보드 복사 fallback

운영자 관점에서 필요한 정보:

- 현재 노출 방식 배지
- 공개 URL 미리보기
- 마지막 저장 기준 복사 가능한 URL

## 7. API 계획

### 7.1 이벤트 목록 API

프런트 프록시:

- `frontend/app/api/events/route.ts`

백엔드:

- `GET /api/events`

초기 쿼리 후보:

- `status=OPEN|UPCOMING|CLOSED`
- `q=keyword`
- `limit`

응답 필드 최소안:

```json
[
  {
    "id": 11,
    "name": "PERFO 2026 SEOUL",
    "venue": "올림픽공원",
    "validFrom": "2026-06-01T19:00:00+09:00",
    "validUntil": "2026-06-01T22:00:00+09:00",
    "saleOpenAt": "2026-05-20T12:00:00+09:00",
    "saleCloseAt": "2026-06-01T18:00:00+09:00",
    "remainingQuantity": 120,
    "totalQuantity": 300,
    "maxPerUser": 2,
    "allowDuplicate": false,
    "active": true,
    "saleStatus": "OPEN",
    "discoveryMode": "LISTED",
    "publicBookingPath": "/events/11"
  }
]
```

### 7.2 이벤트 상세 API

프런트 프록시:

- `frontend/app/api/events/[eventId]/route.ts`

백엔드:

- `GET /api/events/{eventId}`

상세는 목록 필드와 동일한 코어 정보를 제공하되, 구매 CTA에 필요한 값은 모두 포함해야 한다.

`LINK_ONLY` 항목도 상세 조회는 허용하되, 목록 API에서는 제외한다.

### 7.3 구매 API 연결

기존 경로 유지:

- `POST /api/ticketing/requests`

프런트 상세 화면은 이미 있는 Next API 프록시를 그대로 사용한다.

구매 요청 필드:

- `requestId`
- `eventId`
- `quantity`

### 7.4 운영자 생성/수정 API에 노출 설정 추가

운영자 티켓 생성/수정 payload에는 최소한 다음 필드가 필요하다.

- `discoveryMode`
  - `LISTED`
  - `LINK_ONLY`

선택 필드 후보:

- `publicSlug`
  - 후속으로 숫자 ID 대신 사용자 친화적 URL을 원할 때 사용

응답 필드 후보:

- `discoveryMode`
- `publicBookingPath`
- `publicBookingUrl`

## 8. 백엔드 구현 계획

### 8.1 이벤트 조회 서비스 추가

필요 파일 후보:

- `backend/src/main/kotlin/com/perfo/backend/controller/EventController.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/EventQueryService.kt`
- `backend/src/main/kotlin/com/perfo/backend/dto/EventDto.kt`
- `backend/src/main/kotlin/com/perfo/backend/repository/EventRepository.kt`

핵심 규칙:

- `active=true` 인 이벤트만 기본 노출
- `discoveryMode=LISTED` 인 이벤트만 목록 노출
- 판매 상태는 DB 현재 시각 기준 또는 최소한 서버 현재 시각 기준으로 파생 계산
- 목록 조회는 구매 트랜잭션과 분리된 read path여야 한다

권장 상태 파생:

- `UPCOMING`
- `OPEN`
- `SOLD_OUT`
- `CLOSED`
- `INACTIVE`

### 8.2 projection 활용 범위

현재 있는 `ticketing_purchase_projection`은 운영 확인용이다.

초기 사용자 화면에서는 다음 용도로만 제한적으로 활용한다.

- 상세 화면에 최근 시도 수나 최근 성공/실패 집계 표시가 정말 필요할 때만 보조 지표로 사용

초기 범위에서는 projection 없이도 이벤트 조회 구현이 가능해야 한다.

## 9. 프런트 구현 계획

### 9.1 내비게이션 수정

수정 파일:

- `frontend/app/[locale]/(main)/layout.tsx`

변경:

- `events` 탭 추가
- 로그인 후 첫 진입 또는 추천 진입점을 `events`로 재정의할지 함께 검토

### 9.2 이벤트 목록 화면

신규 파일 후보:

- `frontend/app/[locale]/(main)/events/page.tsx`
- 필요 시 `events.types.ts`, `events.constants.ts`

작업:

- 목록 fetch
- 상태 필터
- empty state
- 카드 클릭 네비게이션

### 9.3 이벤트 상세 화면

신규 파일 후보:

- `frontend/app/[locale]/(main)/events/[eventId]/page.tsx`

작업:

- 상세 fetch
- 수량 선택
- 구매 버튼
- 결과 메시지 처리
- 성공 시 `reserved`로 이동

### 9.4 예매 결과 메시지

초기 메시지 기준:

- `NOT_OPEN`: 아직 예매 시작 전입니다
- `SALE_CLOSED`: 예매가 종료되었습니다
- `SOLD_OUT`: 매진되었습니다
- `SUCCESS`: 예매가 완료되었습니다

### 9.5 운영자 공유 UX

대상:

- `frontend/app/[locale]/(main)/my-tickets/page.tsx`

작업:

- 생성/수정 폼에 `discoveryMode` 토글 추가
- 저장 완료 후 공개 URL 노출
- `복사` 버튼 추가
- 모바일/지원 브라우저에서 `공유` 버튼 추가
- `LINK_ONLY` 상태는 카드에서도 배지로 표시

## 10. 구현 순서

1. 이벤트 목록/상세 API 계약 정의
2. 백엔드 `GET /api/events`, `GET /api/events/{eventId}` 구현
3. 프런트 Next API 프록시 구현
4. 메인 탭에 `events` 추가
5. 운영자 티켓 생성/수정 계약에 `discoveryMode`, 공개 URL 필드 추가
6. 이벤트 목록 화면 구현
7. 이벤트 상세 화면 구현
8. 상세에서 `POST /api/ticketing/requests` 연결
9. 운영자 화면에 토글, URL 복사/공유 UX 추가
10. 성공 후 `reserved` 이동 처리
11. 테스트 추가

## 11. 테스트 계획

### 11.1 백엔드

- `GET /api/events` 목록 반환
- `LINK_ONLY` 항목이 목록에서 제외되는지 확인
- inactive 이벤트 비노출
- 상태 파생 계산 검증
- `GET /api/events/{eventId}` 단건 조회
- 존재하지 않는 이벤트 404

### 11.2 프런트

- 목록 화면 로딩/빈 상태/오류 상태
- 상태별 CTA 렌더링
- `LISTED`만 목록에 노출되는지 확인
- 상세 화면에서 구매 요청 호출
- `SUCCESS` 후 `reserved` 이동
- `NOT_OPEN`, `SALE_CLOSED`, `SOLD_OUT` 메시지 표시
- 운영자 폼에서 `노출 방식` 토글과 URL 복사 버튼 동작 확인

### 11.3 E2E

1. 로그인
2. `LISTED` 이벤트가 `events` 탭에 보이는지 확인
3. 이벤트 상세 진입
4. 예매 요청
5. `reserved`에서 결과 확인
6. `LINK_ONLY` 이벤트는 목록에 없고, 직접 URL 접근은 되는지 확인

## 12. 범위에서 제외할 것

- 결제 단계
- 좌석 선택
- waiting room
- 검색 추천/랭킹
- 푸시 알림 자동 구독 유도
- 이벤트 이미지 CDN 최적화
- projection 기반 실시간 경쟁률 노출
- 링크 단축기
- SNS별 공유 카드 최적화

## 13. 완료 기준

- 로그인한 사용자가 앱 안에서 예매 가능한 이벤트를 발견할 수 있다.
- 이벤트 상세에서 바로 예매 요청을 시작할 수 있다.
- 구매 성공 후 사용자가 `reserved`에서 결과를 확인할 수 있다.
- 기존 티켓팅 코어를 건드리지 않고 사용자 플로우가 닫힌다.

## 14. 우선 구현 결론

지금 가장 먼저 필요한 것은 새 티켓팅 엔진을 또 확장하는 것이 아니라, 이미 있는 구매 코어를 실제 사용자 플로우로 연결하는 것이다.

따라서 1차 구현 범위는 다음 네 가지로 제한하는 것이 맞다.

1. `GET /api/events`
2. `GET /api/events/{eventId}`
3. `events` 목록/상세 화면
4. 상세 화면에서 기존 `POST /api/ticketing/requests` 연결
5. 티켓 생성/수정 시 `LISTED` / `LINK_ONLY` 토글
6. 저장 후 예매 URL 복사/공유 UX

이 범위를 끝내면 “티켓을 어디서 보고 어떻게 예매하는지”라는 현재 공백이 해소된다.
