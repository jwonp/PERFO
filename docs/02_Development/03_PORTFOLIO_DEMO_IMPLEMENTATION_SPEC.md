# PERFO 포트폴리오 데모 구현 스펙

## 1. 문서 목적

이 문서는 [02_PORTFOLIO_DEMO_PLAN.md](./02_PORTFOLIO_DEMO_PLAN.md)에서 정리한 방향을 실제 구현 가능한 작업 단위로 내린 문서다.

이 문서의 목표는 다음과 같다.

- 이번 지원 시즌에 바로 쓸 수 있는 `MVP 데모` 범위를 확정한다.
- 현재 코드베이스 기준으로 어떤 파일을 바꾸면 되는지 명시한다.
- 데모 계정, 시드 데이터, 배포 체크리스트를 실제 운영 관점에서 정리한다.

## 2. 이번에 만들 MVP 범위

이번에는 욕심내지 않고 아래까지만 만드는 것을 권장한다.

1. `/demo` 전용 랜딩 페이지
2. `관람객 체험` / `운영자 체험` 2개 진입 버튼
3. 데모 계정 2개
4. 공개 이벤트 1개 + 링크 전용 이벤트 1개
5. 예약 QR 체험 가능 상태
6. 운영자 검표 체험 가능 상태
7. 데모 데이터 리셋 스크립트

즉, 이번 MVP의 목적은 "자동 임시 계정 생성"이 아니라, **실패 확률 낮은 포트폴리오 체험 링크를 안정적으로 운영하는 것**이다.

## 3. 현재 코드베이스 기준 제약

### 3.1 이미 활용 가능한 구조

- 공개 이벤트 접근 허용: [frontend/proxy.ts](../../frontend/proxy.ts)
- 공개 이벤트 목록: [frontend/app/[locale]/(main)/events/page.tsx](../../frontend/app/[locale]/(main)/events/page.tsx)
- 공개 이벤트 상세: [frontend/app/[locale]/(main)/events/[eventId]/page.tsx](../../frontend/app/[locale]/(main)/events/[eventId]/page.tsx)
- 예약 목록: [frontend/app/[locale]/(main)/reserved/page.tsx](../../frontend/app/[locale]/(main)/reserved/page.tsx)
- 예약 QR 상세: [frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx](../../frontend/app/[locale]/(main)/reserved/[reservationId]/page.tsx)
- 운영자 검표 화면: [frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx](../../frontend/app/[locale]/(scanner)/my-tickets/[ticketId]/scan/page.tsx)
- NextAuth 설정: [frontend/lib/auth/auth.config.ts](../../frontend/lib/auth/auth.config.ts)
- 세션 user role 확장: [frontend/types/next-auth.d.ts](../../frontend/types/next-auth.d.ts)

### 3.2 현재 제약

- Credentials 로그인은 현재 백엔드 `/api/auth/login`에 의존한다.
- 사용자 role은 현재 `USER`, `ORGANIZER` 두 가지다.
- 데모 전용 자동 세션 발급 엔드포인트는 아직 없다.
- 백엔드에는 데모 시드를 자동으로 넣는 전용 진입점이 아직 없다.

따라서 **이번 MVP는 고정 데모 계정 기반**으로 가는 것이 가장 안전하다.

## 4. 권장 MVP 아키텍처

### 4.1 이번 시즌 권장안

다음 조합을 추천한다.

1. 공개 이벤트는 비로그인으로 바로 노출
2. `/demo` 페이지에서 체험 경로를 설명
3. 데모 계정 2개를 별도 문구 또는 버튼으로 제공
4. 로그인 후 바로 목표 화면으로 보내기
5. 데모 DB는 주기적으로 재시드

### 4.2 이번 MVP에서 하지 않는 것

이번 문서 기준 MVP에서는 아래는 보류한다.

- 방문자별 임시 데모 계정 생성
- 역할별 자동 세션 발급 API
- 관리자용 실시간 데모 리셋 UI
- 실제 메일 발송 기반 체험

이건 다음 단계 개선 과제다.

## 5. 추천 데모 동선

### 5.1 관람객 체험 동선

1. `/ko/demo`
2. `관람객 체험 시작`
3. `/ko/events`
4. 공개 이벤트 상세 `/ko/events/{eventId}`
5. `예매하기`
6. 로그인 필요 시 `/ko/login?callbackUrl=/ko/events/{eventId}`
7. 데모 계정 로그인
8. 예매 완료 후 `/ko/reserved`
9. QR 보기 `/ko/reserved/{reservationId}`

### 5.2 운영자 체험 동선

1. `/ko/demo`
2. `운영자 체험 시작`
3. 로그인 필요 시 `/ko/login?callbackUrl=/ko/my-tickets`
4. 운영자 데모 계정 로그인
5. `/ko/my-tickets`
6. 검표 화면 `/ko/my-tickets/{ticketId}/scan`

## 6. 화면 IA 제안

## 6.1 새로 추가할 페이지

- `frontend/app/[locale]/demo/page.tsx`

이 페이지는 아래 블록으로 구성한다.

1. Hero
2. 체험 선택 카드 2개
3. 3분 체험 가이드
4. 데모 계정 안내
5. 주의 문구

## 6.2 Hero 문구 초안

제목:

`PERFO Demo`

설명:

`공개 이벤트 조회, 예매, 예약 QR, 운영자 검표까지 이어지는 티켓팅 플로우를 직접 체험할 수 있습니다.`

버튼:

- `관람객 체험 시작`
- `운영자 체험 시작`

## 6.3 관람객 카드 초안

제목:

`관람객 체험`

설명:

`공개 이벤트를 보고 예매한 뒤 예약 QR을 확인합니다.`

주요 이동:

- `/ko/events`

## 6.4 운영자 카드 초안

제목:

`운영자 체험`

설명:

`발급된 티켓을 관리하고 검표 스캔 결과를 확인합니다.`

주요 이동:

- `/ko/my-tickets`

## 6.5 계정 안내 섹션 초안

문구 예시:

`데모 전용 계정으로 바로 체험할 수 있습니다. 이 환경은 주기적으로 초기화됩니다.`

표시 항목:

- 관람객 계정 이메일
- 운영자 계정 이메일
- 비밀번호
- 추천 체험 순서

중요:

처음부터 비밀번호를 메인 CTA로 크게 노출하지 말고, `데모 계정 보기` 또는 `로그인 정보 펼치기` 형태로 한 단계 뒤에 두는 것이 더 좋다.

## 7. MVP 기준 로그인 UX

### 7.1 가장 현실적인 방식

이번 구현에서는 로그인 UX를 아래처럼 정리한다.

1. `/demo` 페이지에서 데모 계정 안내 제공
2. 버튼 클릭 시 로그인 페이지로 이동
3. 사용자는 데모 계정으로 로그인
4. `callbackUrl`로 원래 보려던 화면 복귀

이 방식은 현재 [frontend/app/[locale]/(auth)/login/page.tsx](../../frontend/app/[locale]/(auth)/login/page.tsx) 구조와 가장 잘 맞는다.

### 7.2 개선 가능한 작은 UX

완전한 1클릭 자동 로그인 전까지는 아래 정도만 추가해도 충분히 좋아진다.

- `데모 관람객 계정 사용`
- `데모 운영자 계정 사용`

버튼을 누르면:

- 이메일 입력창을 자동으로 채워준다.
- `callbackUrl`은 유지한다.

비밀번호는 사용자가 복사하거나, `표시/복사` 버튼으로 입력한다.

이 정도만 해도 체감 마찰이 크게 줄어든다.

### 7.3 이번 MVP에서 추천하지 않는 방식

- 프론트 코드에 demo password를 하드코딩
- 일반 운영 계정과 데모 계정 혼용
- 로그인 없이 보호 화면을 모두 공개

## 8. 파일 단위 작업 목록

## 8.1 프론트엔드

### 새 파일

- `frontend/app/[locale]/demo/page.tsx`
- `frontend/app/[locale]/demo/__tests__/DemoPage.test.tsx`
- `frontend/components/demo/DemoEntryCard.tsx`
- `frontend/components/demo/DemoAccountPanel.tsx`
- `frontend/lib/demo/demo-config.ts`

### 수정 파일

- [frontend/proxy.ts](../../frontend/proxy.ts)
  - `/demo`를 public path에 추가
- [frontend/messages/ko.json](../../frontend/messages/ko.json)
- [frontend/messages/en.json](../../frontend/messages/en.json)
- [frontend/messages/ja.json](../../frontend/messages/ja.json)
  - 데모 페이지 문구 추가
- [frontend/app/[locale]/(auth)/login/page.tsx](../../frontend/app/[locale]/(auth)/login/page.tsx)
  - 데모 계정 빠른 사용 UX 추가
- [frontend/app/sitemap.ts](../../frontend/app/sitemap.ts)
  - `/demo`를 sitemap에 포함할지 여부 결정
- [frontend/app/robots.ts](../../frontend/app/robots.ts)
  - `/demo` 색인 허용 여부 결정

## 8.2 백엔드

### 신규 후보

- `backend/src/main/kotlin/com/perfo/backend/config/DemoDataProperties.kt`
- `backend/src/main/kotlin/com/perfo/backend/service/DemoDataService.kt`
- `backend/src/main/kotlin/com/perfo/backend/controller/DemoAdminController.kt`
  - 단, 공개 API는 아니고 내부 운영용일 때만

### 우선순위 높은 실제 작업

- 데모 사용자 생성/갱신 스크립트
- 데모 이벤트/티켓 재시드 스크립트
- 운영 환경에서 메일/외부 발송 비활성 또는 mock 처리

이번 MVP에서는 백엔드 신규 API보다 **재시드 스크립트 준비**가 더 중요하다.

## 9. 환경변수 제안

프론트엔드:

- `NEXT_PUBLIC_DEMO_ENABLED=true`
- `NEXT_PUBLIC_DEMO_VIEWER_EMAIL=demo.viewer@perfo.local`
- `NEXT_PUBLIC_DEMO_OPERATOR_EMAIL=demo.operator@perfo.local`

백엔드 또는 배포 시크릿:

- `DEMO_SHARED_PASSWORD=...`
- `DEMO_RESET_ENABLED=true`
- `DEMO_MODE=true`

주의:

- 이메일은 공개되어도 괜찮지만, 비밀번호는 `NEXT_PUBLIC_`로 두지 않는 것이 좋다.
- 초기 MVP에서는 비밀번호를 UI에 직접 노출하기보다, 지원 문서 또는 보호된 데모 페이지 안에서만 보여주는 것이 낫다.

## 10. 시드 데이터 명세

아래 엔티티를 기준으로 시드를 구성한다.

- [User](../../backend/src/main/kotlin/com/perfo/backend/entity/User.kt)
- [Event](../../backend/src/main/kotlin/com/perfo/backend/entity/Event.kt)
- [IssuedTicket](../../backend/src/main/kotlin/com/perfo/backend/entity/IssuedTicket.kt)
- [Ticket](../../backend/src/main/kotlin/com/perfo/backend/entity/Ticket.kt)

## 10.1 사용자 시드

### 관람객 계정

- email: `demo.viewer@perfo.local`
- provider: `credentials`
- role: `USER`
- name: `PERFO Demo Viewer`

### 운영자 계정

- email: `demo.operator@perfo.local`
- provider: `credentials`
- role: `ORGANIZER`
- name: `PERFO Demo Operator`

## 10.2 이벤트 시드

### 공개 이벤트

- name: `PERFO Showcase 2026`
- venue: `Blue Hall Seoul`
- discoveryMode: `LISTED`
- active: `true`
- saleStatus 기준: 현재 시각에 `OPEN`으로 계산되도록 설정
- remainingQuantity: 충분히 남김
- maxPerUser: `1` 또는 `2`

### 링크 전용 이벤트

- name: `PERFO Private Invitation`
- venue: `Sky Theater`
- discoveryMode: `LINK_ONLY`
- active: `true`
- saleStatus 기준: `OPEN`

## 10.3 운영자용 발급 티켓 시드

- ownerUserId: 운영자 user id
- discoveryMode: `LISTED` 또는 `LINK_ONLY`
- status: `VERIFYING`
- issuedCount: 1 이상
- 검표 가능한 상태 유지

## 10.4 예약 티켓 시드

### QR 성공 케이스

- userId: 관람객 demo user id
- ticketingStatus: `SUCCESS`
- usageStatus: `NOW_SERVING` 또는 현재 서비스에서 QR 표시 가능한 값

### QR 사용 완료 케이스

- userId: 관람객 demo user id
- ticketingStatus: `SUCCESS`
- usageStatus: `USED`

이렇게 두 케이스를 같이 두면 `예약 목록`, `필터`, `QR`, `사용 완료 상태`까지 동시에 시연할 수 있다.

## 11. 리셋 전략

### 11.1 이번 MVP 권장안

가장 단순한 방법은 아래 두 가지 중 하나다.

1. SQL 재적재 스크립트
2. 애플리케이션 시작 시 demo mode에서만 재시드

이번 프로젝트에는 Flyway migration이 있으므로, 마이그레이션과 별도로 **데모용 재시드 SQL 또는 Kotlin 서비스**를 두는 것이 더 안전하다.

### 11.2 추천 구현

- `scripts/reset-demo-data.sh`
- 내부에서 DB 연결 후:
  - demo users upsert
  - demo events reset
  - demo tickets reset
  - remaining quantity reset

### 11.3 리셋 시점

- 지원서 제출 직전
- 면접 직전
- 하루 1회 예약 실행

## 12. 배포 구성 권장안

## 12.1 권장 환경 분리

- production: 실제 운영/메인 포트폴리오 소개
- demo: 포트폴리오 체험 전용

가능하면 `demo` 환경은 아래를 분리한다.

- DB
- object storage bucket/path
- 메일 발송 설정
- 알림 발송 설정

## 12.2 추천 URL

- `https://demo.perfo...`
- 또는 `https://perfo-demo.vercel.app`

## 12.3 접근 제어

선호 순서:

1. Vercel Shareable Link + Deployment Protection
2. Basic auth 유사 보호
3. 완전 공개

포트폴리오 용도라면 완전 공개보다 **링크 공유형 보호**가 더 적절하다.

## 13. `/demo` 페이지에서 넣을 실제 가이드 문구

### 짧은 안내

`추천 체험 순서: 공개 이벤트 보기 -> 데모 로그인 -> 예약 QR 또는 운영자 검표`

### 상태 안내

`이 데모 환경은 포트폴리오 체험용으로 주기적으로 초기화됩니다.`

### 운영자 안내

`운영자 체험에서는 검표용 티켓을 확인하고 QR 토큰 검증 결과를 볼 수 있습니다.`

## 14. 실제 구현 순서

### Step 1

`/demo` 페이지 추가

완료 조건:

- 비로그인으로 접근 가능
- 관람객/운영자 CTA 보임
- 데모 계정 안내 보임

### Step 2

`proxy.ts`에서 `/demo` 공개 허용

완료 조건:

- `/ko/demo`, `/en/demo`, `/ja/demo` 모두 로그인 없이 접근 가능

### Step 3

메시지 번역 추가

완료 조건:

- 3개 locale에서 텍스트 누락 없음

### Step 4

로그인 페이지 데모 UX 보강

완료 조건:

- 데모 계정 이메일 빠른 입력
- `callbackUrl` 유지

### Step 5

데모 시드 및 리셋 스크립트

완료 조건:

- 관람객/운영자 계정 생성
- 공개 이벤트/링크 이벤트 생성
- 예약/검표 데이터 생성
- 반복 실행해도 정상 상태 유지

### Step 6

배포 및 점검

완료 조건:

- 외부 링크에서 진입 가능
- 관람객 체험 성공
- 운영자 검표 체험 성공
- 리셋 재실행 후 상태 복구 확인

## 15. 면접/지원 직전 운영 체크리스트

배포 직전 확인:

- `/ko/demo` 접속 가능
- 이벤트 목록 로딩 정상
- 공개 이벤트 상세 정상
- 관람객 계정 로그인 정상
- 예매 성공 후 `/reserved` 진입 정상
- 예약 QR 표시 정상
- 운영자 계정 로그인 정상
- `/my-tickets` 진입 정상
- 검표 성공 결과 확인
- 검표 실패 결과도 확인 가능

지원서 제출 전:

- 데모 데이터 리셋
- 링크 클릭 테스트
- 모바일 화면 1회 확인
- 로그/에러 모니터링 확인

## 16. 다음 단계 개선안

MVP 이후 개선 우선순위는 아래다.

1. 자동 데모 세션 발급
2. 역할별 즉시 로그인
3. 데모 전용 운영 헬스체크
4. 관리자 리셋 버튼
5. 데모 사용 로그 집계

## 17. 최종 권장 결론

이번 시즌에는 아래가 가장 현실적이다.

1. `/demo` 페이지를 만든다.
2. 공개 이벤트는 바로 보여준다.
3. 데모 계정 2개로 관람객/운영자 시나리오를 분리한다.
4. 데이터 리셋 스크립트를 반드시 준비한다.
5. 자동 임시 계정 생성은 다음 단계로 미룬다.

즉, 지금 가장 중요한 것은 "가장 화려한 데모 시스템"이 아니라 **링크 하나로 실패 없이 핵심 플로우를 보여주는 안정적인 포트폴리오 경험**이다.
