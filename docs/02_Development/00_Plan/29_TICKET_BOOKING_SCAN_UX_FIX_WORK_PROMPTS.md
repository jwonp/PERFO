# 티켓 예매/검표 UX 이슈 구현 프롬프트

> 목적: `28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md`를 실제 구현 단위로 실행하기 위한 순서형 프롬프트 모음이다.
>
> 사용 방식:
> - 한 번에 하나의 프롬프트만 실행한다.
> - 각 프롬프트는 독립 PR 또는 독립 commit 단위로 처리한다.
> - 가능한 한 TDD 순서로 진행한다.
> - 각 단계 완료 후 변경 파일, 테스트 결과, 남은 위험을 정리한다.

## 공통 시작 프롬프트

```txt
PERFO의 티켓 예매/검표 UX 이슈를 구현한다.

반드시 지킬 것:
- AGENTS.md와 docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md를 기준으로 작업한다.
- 작업 전 현재 브랜치와 git status를 확인한다.
- 범위 밖 변경은 건드리지 않는다.
- 가능한 범위에서 테스트를 먼저 추가한 뒤 구현한다.
- 공개 사용자 경로와 운영자 경로를 분리한다.
- UI 색상 변경은 단순히 상태색 배경을 더 진하게 하는 방식으로 해결하지 않는다.
- 수정 후 관련 unit/integration test를 실행한다.
- 테스트를 못 돌리면 이유를 남긴다.

먼저 현재 변경 상태와 이번 프롬프트의 수정 범위를 짧게 요약한 뒤 작업을 시작해라.
```

## 1. 기준선 확인

```txt
티켓 예매/검표 UX 이슈 구현 전 기준선을 확인해줘.

대상:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md
- frontend/package.json
- frontend/vitest.config.ts
- frontend/playwright.config.ts
- backend/build.gradle

할 일:
1. 현재 git status를 확인한다.
2. 프론트/백엔드 테스트 명령을 확인한다.
3. 이번 이슈와 직접 관련된 파일 목록을 정리한다.
4. 구현 순서를 3~5단계로 짧게 요약한다.

코드 수정은 하지 말고 분석 결과만 정리한다.
```

완료 기준:

- 관련 파일 범위가 고정되어 있다.
- 테스트 명령과 구현 순서가 정리되어 있다.

## 2. 공개 티켓 이미지 노출 수정

```txt
공개 예매 화면에서 티켓 이미지를 정상 노출하도록 수정해줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- 비로그인 사용자도 /events 와 /events/{eventId} 에서 티켓 이미지를 볼 수 있어야 한다.
- 운영자 전용 이미지 API와 공개 이미지 API를 분리한다.
- 기존 운영자용 업로드/삭제/수정 흐름은 유지한다.

대상 파일 후보:
- backend/src/main/kotlin/com/perfo/backend/controller/TicketController.kt
- backend/src/main/kotlin/com/perfo/backend/service/EventQueryService.kt
- backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt
- backend/src/main/kotlin/com/perfo/backend/service/TicketImageStorageService.kt
- backend/src/main/kotlin/com/perfo/backend/dto/EventDto.kt
- frontend/lib/events/public-events.ts
- frontend/components/tickets/BookableTicketCard.tsx
- 관련 route/test 파일

할 일:
1. 공개 이미지 조회용 endpoint를 새로 만든다.
2. 공개 이벤트 응답의 imageUrl이 새 공개 endpoint를 가리키게 바꾼다.
3. 공개 endpoint는 공개 예매 가능한 티켓에만 응답하도록 제한한다.
4. 운영자 전용 /api/tickets/{ticketId}/image GET 권한 구조는 유지한다.
5. 비로그인 사용자 기준 테스트를 추가한다.

검증:
- backend 관련 테스트 실행
- frontend 이벤트 상세/목록 테스트 실행

마지막에 공개 경로와 비공개 경로가 어떻게 분리됐는지 설명해라.
```

완료 기준:

- 공개 이벤트 카드 이미지가 인증 없이 로드된다.
- 운영자 전용 이미지 API는 여전히 보호된다.

## 3. 이벤트 상세 문구와 메타 구조 정리

```txt
/events/{eventId} 상세 화면의 문구와 메타 구조를 정리해줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- `판매 시작:`, `판매 종료:`, `1인당 최대:`, `노출 방식:` 같은 관리형 라벨 문구를 제거한다.
- 날짜는 절대 시각 기반 문장형 카피로 바꾼다.
- `링크 전용`은 중복 노출되지 않게 한 군데에서만 보여준다.
- 장소 아래 칩과 만료 정보 중복을 줄인다.

대상 파일 후보:
- frontend/components/events/PublicEventDetailPageContent.tsx
- frontend/components/tickets/BookableTicketCard.tsx
- frontend/components/tickets/ticket-shell.tsx
- frontend/app/[locale]/(main)/events/[eventId]/__tests__/EventDetailPage.test.tsx
- locale message 파일

할 일:
1. 상세 페이지 전용 메타 문구 포맷터를 만든다.
2. 예매 시작/만료/예매 가능 수량/링크 전용을 문장형 UI로 바꾼다.
3. 상세 뷰에서만 숨겨야 할 카드 공통 메타가 있으면 prop으로 제어한다.
4. 기존 카드 공용 구조를 최대한 유지하되 상세에서의 중복만 제거한다.
5. 테스트를 현재 기대 문구 기준으로 갱신한다.

검증:
- EventDetailPage 테스트 실행
- 가능하면 events 관련 단위 테스트도 함께 실행

최종 결과에서 상세 페이지에 남는 메타 문구를 그대로 적어줘.
```

완료 기준:

- 상세 화면 문구가 자연스러운 문장형으로 바뀐다.
- `링크 전용`과 날짜 정보 중복이 사라진다.

## 4. 예매 버튼 결과 처리 수정

```txt
PublicBookingButton이 예매 실패를 성공처럼 처리하는 문제를 고쳐줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- response.ok만 보지 말고 response body의 result를 해석한다.
- SUCCESS가 아니면 /reserved로 이동하면 안 된다.
- DUPLICATE_PURCHASE, MAX_PER_USER_EXCEEDED, SALE_CLOSED, NOT_OPEN 등을 사용자 문구로 보여준다.
- 401이면 기존처럼 로그인으로 보낸다.

대상 파일 후보:
- frontend/components/events/PublicBookingButton.tsx
- frontend/app/api/ticketing/requests/route.ts
- backend/src/main/kotlin/com/perfo/backend/service/TicketingService.kt
- frontend/app/[locale]/(main)/events/[eventId]/__tests__/EventDetailPage.test.tsx
- 필요 시 locale message 파일

할 일:
1. 실패 result 매핑 테이블을 프런트에 만든다.
2. SUCCESS일 때만 /reserved로 이동하게 수정한다.
3. 실패 상태별로 사용자 메시지를 다르게 보여준다.
4. 기존 테스트에 실패 case를 추가한다.

검증:
- EventDetailPage 테스트 실행
- 티켓팅 관련 백엔드 테스트 중 영향 범위를 확인

마지막에 어떤 result를 어떤 사용자 문구로 매핑했는지 표처럼 정리해라.
```

완료 기준:

- 실패 result에서 성공 라우팅이 일어나지 않는다.
- 최소 DUPLICATE_PURCHASE와 MAX_PER_USER_EXCEEDED는 명시적 문구로 안내된다.

## 5. 검표 결과 UI와 수동 입력 UX 수정

```txt
검표 완료 UI와 수동 입력 UX를 정리해줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- 최근 결과 패널 배경은 중립 계열로 유지한다.
- 성공/실패 상태는 칩, 아이콘, 얇은 강조선 정도로만 표현한다.
- `Ticket verified` 같은 서버 영문 메시지를 메인 카피로 쓰지 않는다.
- 수동 토큰 입력 후에는 성공/실패와 무관하게 인풋을 비운다.

대상 파일 후보:
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/ScanResultPanel.tsx
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/scan.func.ts
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/use-ticket-validation.hooks.ts
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/__tests__/TicketScanPage.test.tsx
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/scan.func.test.ts

할 일:
1. result panel 스타일 메타를 중립 배경 기준으로 재설계한다.
2. 본문 1순위 문구를 translatedResultLabel로 바꾼다.
3. 서버 message는 필요하면 보조 텍스트로만 처리하거나 숨긴다.
4. manual submit 경로에서는 결과와 무관하게 qrToken을 비운다.
5. 테스트에 성공/실패 후 input clear를 추가한다.

검증:
- TicketScanPage 테스트 실행
- scan.func 관련 테스트 실행

최종 결과에서 성공/실패 패널이 어떤 정보 순서로 보이는지 설명해라.
```

완료 기준:

- 결과 패널 가독성이 좋아진다.
- 수동 입력 후 항상 다시 입력 가능한 초기 상태로 돌아간다.

## 6. QR 재발급 차단과 예약 상세 terminal state 처리

```txt
이미 사용했거나 만료된 티켓에 대해 QR 재발급이 되지 않도록 막아줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- QR 토큰 발급은 NOW_SERVING 상태에서만 허용한다.
- USED, EXPIRED, BEFORE_SERVING 상태에서는 상태에 맞는 실패 응답을 준다.
- reserved/{reservationId} 페이지는 terminal 상태에서 자동 재발급 타이머를 멈춘다.
- terminal 상태면 QR 대신 명시적 안내 UI를 보여준다.

대상 파일 후보:
- backend/src/main/kotlin/com/perfo/backend/service/TicketVerificationService.kt
- backend/src/test/kotlin/com/perfo/backend/service/TicketVerificationServiceTest.kt
- frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx
- frontend/app/[locale]/(main)/reserved/__tests__/ReservedQrPage.test.tsx
- 필요 시 frontend/app/api/reservations/[reservationId]/qr-token/route.ts

할 일:
1. issueReservationQrToken에 usageStatus 판정을 추가한다.
2. 상태별 실패 응답 정책을 정한다.
3. ReservedQrPage가 terminal 상태를 렌더링하도록 바꾼다.
4. auto refresh timer가 terminal 상태에서 중단되게 한다.
5. 관련 테스트를 추가/수정한다.

검증:
- backend TicketVerificationService 테스트 실행
- ReservedQrPage 테스트 실행

최종 결과에서 QR 발급 허용 상태와 차단 상태를 명확히 적어줘.
```

완료 기준:

- 사용 완료 티켓 URL로 직접 들어가도 새 QR이 발급되지 않는다.
- terminal 상태에서는 QR 대신 안내 UI가 나온다.

## 7. iPad Safari 스캐너 안정화

```txt
iPad Safari에서 카메라 권한 허용 후에도 검표 화면이 카메라 오류로 떨어지는 문제를 완화해줘.

기준 문서:
- docs/02_Development/00_Plan/28_TICKET_BOOKING_SCAN_UX_FIX_PLAN.md

핵심 요구:
- 권한 획득, 스트림 연결, 디코드 루프를 분리한다.
- 비치명적 decode error는 fatal status로 바꾸지 않는다.
- 모바일 계열은 후면 카메라를 우선 시도한다.
- unmount 시 stream track cleanup까지 한다.

대상 파일 후보:
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/use-qr-scanner.hooks.ts
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/scan.types.ts
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/ScannerViewport.tsx
- frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/__tests__/TicketScanPage.test.tsx

할 일:
1. 현재 scannerStatus 모델이 충분한지 점검하고 필요하면 세분화한다.
2. getUserMedia 기반 초기화 단계를 분리한다.
3. decode loop 에러 중 무시 가능한 것과 fatal한 것을 구분한다.
4. cleanup 로직을 강화한다.
5. 최소한 hook 단위 또는 page 단위 테스트를 보강한다.

검증:
- TicketScanPage 테스트 실행
- 타입 체크 실행

실기기 테스트가 불가능하면, 어떤 부분이 코드상 방어됐고 어떤 부분은 실기기 확인이 남는지 구분해서 적어라.
```

완료 기준:

- 카메라 권한 허용 후 일시적 decode error가 바로 `카메라 오류`로 번역되지 않는다.
- 스트림 정리와 재진입 안정성이 개선된다.

## 8. 통합 검증 프롬프트

```txt
티켓 예매/검표 UX 이슈 수정 이후 통합 검증을 진행해줘.

할 일:
1. 변경 파일 목록을 정리한다.
2. 각 이슈 1~6이 어떤 코드 수정으로 해결됐는지 매핑한다.
3. 실행한 테스트와 결과를 정리한다.
4. 아직 남은 실기기 확인 항목과 운영 리스크를 분리해 적는다.
5. 후속 PR이 필요하면 남은 범위를 제안한다.

가능하면 아래를 우선 실행한다:
- frontend 관련 vitest
- backend 관련 gradle test

최종 답변은 아래 순서로 정리한다:
1. 해결된 이슈
2. 테스트 결과
3. 남은 리스크
```

완료 기준:

- 6개 이슈별 해결 여부가 추적 가능하다.
- 자동 테스트와 수동 확인 항목이 분리되어 있다.
