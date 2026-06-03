# Plan: LINK_ONLY 이벤트 Short URL 공유

## 목표

`LINK_ONLY` 이벤트의 공유 URL을 **비로그인 접근 가능 + 짧고 비추측적**으로 만든다.

현재 `LINK_ONLY` 이벤트는 `/events/12` 같은 순차 ID 기반 URL로 접근한다.
이 URL은 로그인 없이도 접근할 수 있지만 순차 ID이므로 아무나 `/events/1`, `/events/2`, ... 를 시도하면 비공개 이벤트가 노출된다.

이 계획은 두 가지 요구사항을 해결한다:

1. **비로그인 접근**: 링크를 받은 사람은 로그인 없이 이벤트 상세와 예매에 접근할 수 있어야 한다 (현재 이미 가능).
2. **짧은 비추측 URL**: bit.ly처럼 짧은 코드 기반 URL을 사용해 순차 ID의 추측 가능성을 제거한다.

## 현재 상태

### 이미 구현된 것

- `TicketDiscoveryMode.LISTED | LINK_ONLY` enum (backend `Event.kt`)
- `IssuedTicket.discoveryMode` 필드
- `EventController.getEvent(eventId: Long)` — 비로그인 접근 가능
- `EventDto.EventResponse.publicBookingPath` — 현재 `/events/$eventId`
- 프론트 `events/[eventId]/page.tsx` — 비로그인 렌더링
- `sitemap.ts` — `LINK_ONLY` 이벤트 제외
- `robots.index = false` — `LINK_ONLY` 이벤트 SEO 제외

### 문제점

- URL이 `/events/12` 형태 — 순차 ID로 추측 가능
- `LINK_ONLY`의 "링크를 아는 사람만"이라는 의도가 ID 열거로 무력화됨
- URL이 짧지 않음 — 공유 시 불편

## 설계

### URL 형식

```
현재:  perfo.app/ko/events/12
변경:  perfo.app/e/Xk9mQ2p7
```

- 경로: `/e/[shortCode]` — locale prefix 없이 접근, 서버에서 locale redirect 처리
- shortCode: nanoid 8자, URL-safe alphabet (`A-Za-z0-9_-`)
- 경우의 수: 64^8 ≈ 2.8조 — PERFO 규모에서 충돌 확률 사실상 0

### 적용 범위

| discoveryMode | 공개 URL | Short URL | 목록 노출 |
|---|---|---|---|
| `LISTED` | `/events/{id}` (기존 유지) | 없음 | O |
| `LINK_ONLY` | `/events/{id}` 접근 차단 | `/e/{shortCode}` | X |

- `LISTED` 이벤트는 기존 `/events/{id}` 경로 유지. short URL 불필요.
- `LINK_ONLY` 이벤트는 `/events/{id}` 경로에서 404 반환. `/e/{shortCode}`로만 접근 가능.

### 핵심 결정

1. **shortCode는 IssuedTicket 생성 시 자동 생성한다**
   - `discoveryMode = LINK_ONLY`일 때만 생성
   - 이후 `LISTED`로 변경하면 shortCode는 유지하되 `/e/` 경로 비활성화
   - `LISTED` → `LINK_ONLY` 재전환 시 기존 shortCode 재활성화

2. **locale은 URL에 포함하지 않는다**
   - `/e/Xk9mQ2p7` 접근 시 Accept-Language 또는 쿠키 기반으로 locale 결정
   - 공유 URL을 최대한 짧게 유지하기 위함

3. **기존 `/events/{id}` 경로에서 LINK_ONLY 이벤트 접근 차단**
   - `EventController.getEvent()`: `LINK_ONLY`이면 404 반환
   - 프론트 `events/[eventId]/page.tsx`: 서버에서 404 → `notFound()` 동작 유지

## 영향 파일

### Backend

| 파일 | 변경 |
|---|---|
| `entity/IssuedTicket.kt` | `shortCode: String?` 컬럼 추가 |
| `entity/Event.kt` | `shortCode: String?` 컬럼 추가 (IssuedTicket에서 복사) |
| `repository/IssuedTicketRepository.kt` | `findByShortCode(shortCode: String)` 추가 |
| `repository/EventRepository.kt` | `findByShortCode(shortCode: String)` 추가 |
| `controller/EventController.kt` | `getEvent()` — LINK_ONLY 이면 404. `getEventByShortCode(shortCode)` 엔드포인트 추가 |
| `service/EventQueryService.kt` | `getPublicEventByShortCode()` 추가. `publicBookingPath` 생성 로직 수정 |
| `dto/EventDto.kt` | `EventResponse.publicBookingPath` — LINK_ONLY일 때 `/e/{shortCode}` 반환 |
| DB migration | `ALTER TABLE issued_tickets ADD COLUMN short_code VARCHAR(16) UNIQUE` |
| DB migration | `ALTER TABLE events ADD COLUMN short_code VARCHAR(16) UNIQUE` |

### Frontend

| 파일 | 변경 |
|---|---|
| `app/e/[shortCode]/page.tsx` | 새 페이지 — short URL 진입점. locale redirect 또는 직접 렌더 |
| `app/[locale]/(main)/events/[eventId]/page.tsx` | LINK_ONLY 이벤트 접근 시 404 처리 (서버 응답 기반, 기존 동작 유지) |
| `app/[locale]/(main)/my-tickets/TicketFormSheet.tsx` | LINK_ONLY 선택 시 short URL 복사 버튼 |
| `app/[locale]/(main)/my-tickets/TicketList.tsx` | LINK_ONLY 카드에 short URL 표시 + 복사 버튼 |
| `lib/events/public-events.ts` | `getPublicEventByShortCode()` 추가 |
| `app/sitemap.ts` | 변경 없음 (LINK_ONLY 이미 제외됨) |

## 구현 단계

### Step 1: Backend — shortCode 필드 + DB 마이그레이션

1. `IssuedTicket` 엔티티에 `shortCode: String?` 추가 (UNIQUE 인덱스)
2. `Event` 엔티티에 `shortCode: String?` 추가 (UNIQUE 인덱스)
3. DB 마이그레이션 작성
4. nanoid 생성 유틸 추가 (8자, URL-safe)
5. 티켓 생성/수정 시 `discoveryMode = LINK_ONLY`이면 shortCode 자동 생성
6. 기존 `LINK_ONLY` 데이터에 shortCode backfill 마이그레이션

### Step 2: Backend — API 변경

1. `GET /api/events/s/{shortCode}` 엔드포인트 추가 — 비로그인, shortCode로 이벤트 조회
2. `GET /api/events/{eventId}` — `LINK_ONLY` 이벤트이면 404 반환
3. `EventDto.EventResponse.publicBookingPath` — `LINK_ONLY`일 때 `/e/{shortCode}` 반환
4. 테스트 추가

### Step 3: Frontend — Short URL 페이지

1. `app/e/[shortCode]/page.tsx` 생성
2. 서버 컴포넌트에서 `getPublicEventByShortCode()` 호출
3. locale 결정 (Accept-Language / 쿠키) → 기존 이벤트 상세 컴포넌트 재사용
4. OG meta, robots noindex 처리

### Step 4: Frontend — 운영자 공유 UX

1. `TicketFormSheet.tsx` — `LINK_ONLY` 선택 시 short URL 미리보기
2. `TicketList.tsx` — `LINK_ONLY` 카드에 짧은 URL + 복사 버튼
3. Web Share API 지원 기기에서 공유 버튼, 미지원 시 clipboard fallback

## 리스크

| 리스크 | 대응 |
|---|---|
| 기존 `/events/{id}` URL이 이미 공유된 LINK_ONLY 이벤트 | Step 2 적용 시 기존 URL 접근 불가. 운영자에게 short URL 재공유 안내 필요. 또는 transition 기간에 `/events/{id}` → `/e/{shortCode}` 리다이렉트 추가 |
| shortCode 충돌 | 8자 nanoid + UNIQUE 제약. 생성 시 중복 체크 후 재생성 (최대 3회) |
| SEO 영향 | LINK_ONLY 이벤트는 이미 `robots.index = false`, sitemap 제외. 변경 없음 |
| nanoid 라이브러리 의존성 (backend) | Kotlin stdlib `Random`으로 직접 구현 가능. 외부 의존성 불필요 |

## Definition of Done

- [ ] `LINK_ONLY` 이벤트는 `/e/{shortCode}` 로만 접근 가능
- [ ] `/events/{id}` 로 `LINK_ONLY` 이벤트 접근 시 404
- [ ] `/e/{shortCode}` 접근 시 로그인 불필요
- [ ] 운영자 UI에서 LINK_ONLY 이벤트의 short URL 복사 가능
- [ ] shortCode 8자, URL-safe, 비추측적
- [ ] 기존 LINK_ONLY 데이터에 shortCode backfill 완료
- [ ] 기존 테스트 통과 + 신규 테스트 추가
