# 공개 티켓 메뉴 미노출 원인 분석 및 해결 방안

## 문제 요약

운영자 화면에서 발행 티켓이 `ISSUING` 또는 `VERIFYING` 상태로 보이고 `discoveryMode=LISTED`로 공개 처리되어 있어도,
실제 사용자 공개 메뉴(`events` / 티켓 탐색 메뉴)에는 노출되지 않는 현상이 있다.

이번 분석 결과, 이 문제의 핵심 원인은 **운영자 화면과 공개 목록 화면이 서로 다른 기준 데이터를 source of truth로 사용하고 있기 때문**이다.

- 운영자 화면: `issued_tickets` 기준
- 공개 목록 화면: `events` 스냅샷 기준

즉, 발행 티켓 상태와 공개 이벤트 스냅샷 사이에 조금이라도 동기화 드리프트가 생기면,
운영자에게는 `ISSUING`/`VERIFYING`으로 보여도 공개 목록에서는 바로 빠질 수 있다.

---

## 관련 코드 경로

### 운영자 티켓 상태 계산

- `backend/src/main/kotlin/com/perfo/backend/service/TicketService.kt`
  - `findAllByOwnerUserId(...)`
  - `resolveEffectiveStatus(...)`
  - `IssuedTicket.toResponse(...)`

운영자 `my-tickets` 화면에 내려가는 상태는 DB raw status만 그대로 쓰지 않고,
`openAt`, `validDate`를 반영해 동적으로 계산한다.

즉 운영자 화면은 `issued_tickets` 자체를 기준으로 상태를 해석한다.

### 공개 목록 조회

- `backend/src/main/kotlin/com/perfo/backend/service/EventQueryService.kt`
  - `listPublicEvents()`
- `backend/src/main/kotlin/com/perfo/backend/repository/EventRepository.kt`
  - `findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(...)`

공개 목록은 먼저 아래 조건으로 `events` 테이블만 조회한다.

- `active = true`
- `discoveryMode = LISTED`

그 다음에야 `issued_tickets`를 연결해서 보조 메타데이터와 판매 상태를 계산한다.

즉, **공개 목록은 `issued_tickets` 상태를 보기 전에 이미 `events.active` 단계에서 한번 걸러진다.**

---

## 실제 원인

## 1. 공개 목록이 `issued_tickets`가 아니라 `events.active`를 선필터로 사용한다

현재 공개 목록의 시작점은 아래 쿼리다.

- `EventRepository.findByActiveTrueAndDiscoveryModeOrderBySaleOpenAtAscIdAsc(...)`

이 구조에서는 다음 케이스가 모두 미노출로 이어질 수 있다.

- `issued_tickets.status`는 `ISSUING` 또는 `VERIFYING`인데 `events.active=false`로 남아 있는 경우
- `issued_tickets.discoveryMode=LISTED`인데 `events.discoveryMode`가 stale한 경우
- `issued_tickets.event_id` 또는 `events.issued_ticket_id` 연결이 빠져 있는 경우
- 기존 데이터가 backfill 없이 남아 있어 `events` 쪽 공개 스냅샷이 완전하지 않은 경우

즉, `issued_tickets` 기준으로는 공개 대상이어도,
`events` 스냅샷이 조금만 틀어져 있으면 공개 목록에는 아예 진입하지 못한다.

이 문제는 `EventQueryService.listPublicEvents()`가 linked ticket status를 확인하기 전에
이미 `active=true` 조건으로 행을 제거한다는 점에서 구조적으로 발생한다.

---

## 2. 운영자 화면과 공개 목록 화면의 상태 계산 기준이 다르다

운영자 화면은 `TicketService.resolveEffectiveStatus(...)`를 통해 아래를 반영한다.

- `validDate`가 지났는지
- `openAt`이 지났는지
- 저장된 status를 어떻게 해석할지

반면 공개 목록은 `events.active`, `events.saleOpenAt`, `events.saleCloseAt` 같은
동기화된 projection 필드를 먼저 신뢰한다.

즉 두 화면은 같은 티켓을 보더라도 아래처럼 어긋날 수 있다.

- 운영자 화면: `issued_tickets` 기준으로 `ISSUING` 또는 `VERIFYING`
- 공개 목록: `events.active=false`라서 아예 목록에서 제외

이 구조에서는 “운영자 화면에서는 공개 중처럼 보이는데 공개 메뉴에는 없다”는 증상이 자연스럽게 발생한다.

---

## 3. `events` 공개 스냅샷은 동기화 누락에 취약한 구조다

`events` 정보는 `TicketService.syncLinkedEvent(...)`에서 갱신된다.

주요 반영 필드:

- `event.active`
- `event.discoveryMode`
- `event.saleOpenAt`
- `event.saleCloseAt`
- `event.issuedTicketId`

하지만 이 값들은 `issued_tickets`의 정규 source가 아니라 **복제된 projection**이다.

즉 아래 조건 중 하나만 있어도 drift가 생길 수 있다.

- 과거 데이터가 새 공개 모델로 완전히 backfill되지 않음
- 특정 시점에 `syncLinkedEvent(...)`가 적용되기 전에 생성된 데이터가 남아 있음
- 향후 상태 전환/보정 로직 일부가 `events` projection을 항상 갱신하지 않음

특히 마이그레이션 `V20260509_1__event_discovery_mode.sql`은
`issued_ticket_id`, `event_id` 컬럼을 추가하지만,
문서상 별도 backfill 필요성이 이미 언급되어 있고 자동 정합성 복구 로직은 없다.

즉 현재 구조는 **projection drift가 생기면 공개 목록 미노출로 직결되는 구조**다.

---

## 4. `saleOpenAt` 계산도 현재 정책 문서와 다르게 구현돼 있다

현재 `TicketService.resolveSaleOpenAt(...)`는 `issuedTicket.openAt`을 쓰지 않고,
동기화 시점의 `now`를 반환한다.

현재 구현:

- `saleOpenAt = now`

기획/정책 문서의 기대값:

- `saleOpenAt = issuedTicket.openAt`

이 문제는 이번 미노출 현상의 1차 원인이라고 보긴 어렵지만,
공개 이벤트 상태 판단과 정렬을 더 불안정하게 만든다.

즉 현재는 공개 목록이

- `active`
- `discoveryMode`
- `saleOpenAt`

모두 projection에 강하게 의존하는데,
그 projection 자체가 source of truth와 어긋날 가능성이 있다.

---

## 재현 가능한 고장 시나리오

### 시나리오 A. 기존 데이터 / 연결 누락

1. `issued_tickets`는 `ISSUING` 또는 `VERIFYING`
2. `discoveryMode=LISTED`
3. 하지만 `event_id` 또는 `issued_ticket_id` 연결이 없거나 불완전
4. `/api/events`는 `events.active=true`에서 출발하므로 해당 티켓이 목록에 나오지 않음

### 시나리오 B. projection stale

1. 운영자 화면은 `issued_tickets` 기준으로 상태를 계산
2. `events.active` 또는 `events.discoveryMode`가 이전 값으로 남아 있음
3. 운영자 UI에서는 공개 중처럼 보임
4. 공개 메뉴에서는 `events.active=true`를 통과하지 못해 미노출

### 시나리오 C. 판매 시각 drift

1. 티켓의 실제 `openAt`과 `events.saleOpenAt`가 다름
2. 공개 목록/상세의 상태 판단이 운영자 기대와 어긋남
3. 이번 문제의 직접 원인과 별개로, 공개 UX 신뢰도를 추가로 떨어뜨림

---

## 결론

현재 문제의 본질은 다음 한 줄로 정리된다.

**공개 티켓 목록이 `issued_tickets`의 실제 공개 상태를 직접 보지 않고, `events` projection의 `active/discoveryMode/saleOpenAt`에 먼저 의존하기 때문에 미노출 drift가 발생한다.**

즉, 지금 구조에서는 `ISSUING`/`VERIFYING`이라는 사실만으로 공개 목록 노출이 보장되지 않는다.
공개 목록에 나오려면 추가로 아래 projection 상태까지 맞아야 한다.

- `events.active=true`
- `events.discoveryMode=LISTED`
- 연결 관계(`event_id`, `issued_ticket_id`) 정상

이 셋 중 하나라도 어긋나면 목록에서 빠질 수 있다.

---

## 권장 해결 방안

## 해결안 A. 공개 목록의 source of truth를 `issued_tickets`로 바꾼다

가장 권장되는 방향이다.

공개 목록 노출 판단의 기준을 다음처럼 바꾼다.

- `issued_tickets.discoveryMode = LISTED`
- `issued_tickets`의 effective status가 `ISSUING` 또는 `VERIFYING`
- `validDate` 기준 만료 아님
- 연결된 `events`는 재고/판매 수치 표현용으로만 사용

즉 `events.active=true`를 목록 진입의 선행 필터로 쓰지 않는다.

### 기대 효과

- 운영자 화면과 공개 목록 화면이 같은 기준 데이터를 보게 됨
- projection drift가 있어도 미노출 가능성이 크게 줄어듦
- “운영자에겐 공개 중인데 사용자에겐 안 보임” 문제가 구조적으로 줄어듦

### 구현 방향

1. `EventQueryService.listPublicEvents()`를 `events` 선조회 방식에서 분리
2. `issued_tickets` 기준 목록 후보를 구함
3. 필요한 경우 연결된 `event`를 조인해 재고/판매 메타만 보강
4. 공개 여부는 `issued_tickets` effective status로 최종 판정

---

## 해결안 B. `events` projection을 유지하되, 목록 쿼리에서 `active=true` 선필터를 제거한다

단기 완화책으로는 이것도 가능하다.

예를 들어 아래처럼 바꾼다.

- 먼저 `discoveryMode=LISTED` 이벤트를 가져온다
- 연결된 `issued_ticket` effective status를 보고 `INACTIVE`만 제외한다
- `active=true`는 응답 계산용 참고값으로만 사용한다

이 방식은 A보다 덜 근본적이지만,
현재 증상인 “projection stale 때문에 목록에서 사라짐”은 상당 부분 줄일 수 있다.

단, `event` 연결 자체가 없는 기존 데이터는 여전히 놓칠 수 있다.

---

## 해결안 C. `syncLinkedEvent(...)` 동기화 규칙을 바로잡는다

공개 projection을 유지할 거라면 최소한 아래는 고쳐야 한다.

### 수정 필요 항목

1. `saleOpenAt`
- 현재: `now`
- 수정: `ticket.openAt` 우선 사용

2. `active`
- 현재: raw `ticket.status`가 `ISSUING/VERIFYING`인지로 결정
- 수정 권장: `resolveEffectiveStatus(...)` 기반으로 결정

3. `discoveryMode`
- 항상 `issued_tickets.discoveryMode`를 덮어써 projection drift 방지

### 기대 효과

- projection과 source of truth 간 드리프트 감소
- 운영자 화면과 공개 상세/목록의 상태 일관성 개선

단, 이것만으로는 기존 누락 데이터 문제까지 완전히 해결되지 않는다.

---

## 운영 체크리스트

코드 수정 후에도 기존 데이터에 projection drift가 남아 있을 수 있으므로, 운영에서는 아래를 함께 확인하는 것이 안전하다.

1. `issued_tickets.discovery_mode='LISTED'` 이고 effective status가 `ISSUING` 또는 `VERIFYING`인 티켓 수를 점검한다.
2. 같은 티켓에 대해 `issued_tickets.event_id` 또는 `events.issued_ticket_id` 연결이 비어 있는 건수를 확인한다.
3. `events.sale_open_at`이 `issued_tickets.open_at`과 불일치하는 기존 행이 있는지 점검한다.
4. 필요하면 전체 `issued_tickets`를 기준으로 `syncLinkedEvent(...)`에 준하는 resync/backfill 작업을 한 번 수행한다.

---

## 해결안 D. 기존 데이터 backfill + 정합성 재동기화 작업을 수행한다

이미 운영 DB에 누적된 데이터가 있다면 이 단계가 필요하다.

### 1회성 backfill 대상

- `issued_tickets.event_id` 누락 데이터
- `events.issued_ticket_id` 누락 데이터
- `events.discovery_mode` 불일치 데이터
- `events.active` stale 데이터
- `events.sale_open_at`, `events.sale_close_at` drift 데이터

### 권장 작업 방식

1. `issued_tickets` 전수 조회
2. 각 티켓에 대해 `syncLinkedEvent(...)`와 동일한 규칙으로 projection 재구성
3. 누락된 `event`는 생성 또는 연결
4. 연결/상태/노출 필드 재저장

### 운영 점검 쿼리 예시

다음 케이스를 우선 찾는 것이 좋다.

- `issued_tickets.status in ('ISSUING', 'VERIFYING')`
- `issued_tickets.discovery_mode = 'LISTED'`
- 그런데 `event_id is null`
- 또는 연결된 `events.active = false`
- 또는 연결된 `events.discovery_mode <> issued_tickets.discovery_mode`

---

## 최종 권장안

가장 안전한 조합은 아래다.

1. **공개 목록 노출 기준을 `issued_tickets` 중심으로 재설계한다.**
2. `syncLinkedEvent(...)`의 `saleOpenAt` / `active` 계산을 바로잡는다.
3. 운영 DB에 대해 **1회성 backfill / resync**를 수행한다.
4. 회귀 방지를 위해 테스트를 추가한다.

즉,

- 단기: 목록 쿼리 완화 + backfill
- 중기: 공개 목록 source of truth를 `issued_tickets`로 전환

이 순서가 가장 현실적이다.

---

## 권장 테스트 추가

### 백엔드 회귀 테스트

1. `issued_tickets.status=ISSUING`, `discoveryMode=LISTED`, `events.active=false`여도 공개 목록에 노출되는지
2. `issued_tickets.status=VERIFYING`, `event_id/issued_ticket_id`가 backfill 후 정상 노출되는지
3. `LINK_ONLY`는 상세 접근 가능하지만 목록에서는 제외되는지
4. `saleOpenAt`이 `openAt`과 일치하는지

### 운영 스모크 체크

1. `LISTED + ISSUING` 티켓이 `events` 메뉴에 보이는지
2. `LISTED + VERIFYING` 티켓이 `events` 메뉴에 보이는지
3. `LINK_ONLY` 티켓은 직접 URL로만 열리는지
4. 운영자 화면 상태와 공개 목록 상태가 같은 티켓에서 일관되게 보이는지

---

## 작업 우선순위 제안

### P0

- 공개 목록 source of truth 정리
- `saleOpenAt` 계산 수정
- 운영 데이터 backfill/resync

### P1

- 정합성 검증용 관리 스크립트 또는 admin job 추가
- projection drift 감지 로그/지표 추가

### P2

- `events` projection을 명시적 read model로 유지할지,
  아니면 공개 탐색에서는 `issued_tickets` 직접 조회로 단순화할지 구조 결정

---

## 요약

이번 현상은 단순 UI 버그가 아니라 **공개 목록 projection 설계와 source of truth 분리 문제**다.

현재 구조에서는 `ISSUING`/`VERIFYING` 상태만으로 공개 목록 노출이 보장되지 않는다.
실제 노출은 `events.active/discoveryMode/link` 정합성까지 동시에 맞아야 한다.

따라서 해결은 “표시 조건 하나 수정”이 아니라 아래 3개를 같이 해야 한다.

- 공개 목록 판단 기준 재정의
- projection 동기화 로직 수정
- 기존 데이터 backfill/resync
