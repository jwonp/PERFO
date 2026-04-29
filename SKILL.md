# PERFO 프로젝트 SKILL.md

> Claude가 이 프로젝트에서 작업할 때 참조할 컨텍스트 가이드

## 프로젝트 개요

온라인 티켓팅 + 오프라인 QR 인증 모바일 퍼스트 플랫폼

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **인증**: NextAuth.js (Google, Kakao, Naver, Line) + 이메일/비밀번호
- **i18n**: next-intl (en / ja / ko, defaultLocale: en)
- **패키지 매니저**: pnpm

## 디렉토리 구조 (frontend/)

```
app/
  [locale]/
    page.tsx                  ← 랜딩 페이지
    layout.tsx                ← locale + SessionProvider
    (auth)/
      layout.tsx              ← 좌우 분할 데스크톱 레이아웃
      login/page.tsx
      login/password/page.tsx
      signup/page.tsx
      signup/complete/page.tsx
      verify/page.tsx
      reset-password/page.tsx
      reset-password/complete/page.tsx
    (main)/                   ← 로그인 후 서비스 (바텀 내비)
      layout.tsx              ← 바텀 내비게이션 포함
      reserved/page.tsx       ← 예약한 티켓 탭 (RESERVED)
      my-tickets/page.tsx     ← 내가 발급한 티켓 탭 (MY TICKETS)
      profile/page.tsx        ← 마이페이지 탭 (PROFILE)
  api/
    auth/[...nextauth]/route.ts
    push/subscribe/route.ts
    push/send/route.ts
components/
  auth/LogoutButton.tsx
  push/PushNotification.tsx
  providers/SessionProvider.tsx
  locale-switcher.tsx
  ui/                         ← shadcn 컴포넌트 (button, card, input, label)
lib/
  auth/auth.config.ts
  push/config.ts, server.ts
  redis/inventory.ts
  kafka/producer.ts
messages/                     ← en.json, ko.json, ja.json
```

## 브랜드 색상 (globals.css)

```
--color-perfo-primary:       #103783  (네이비 블루 - 메인 강조)
--color-perfo-primary-hover: #0d2d6b
--color-perfo-secondary:     #9BAFD9  (라이트 블루)
--color-perfo-bg:            #F3FBFF  (배경 - 아주 연한 하늘색)
--color-perfo-text:          #342A2D  (텍스트 - 다크 브라운)
--color-perfo-success:       #16a34a
```

Tailwind 클래스: `bg-perfo-bg`, `text-perfo-primary`, `bg-perfo-primary`, `text-perfo-text` 등

## i18n 사용법

- 서버 컴포넌트: `import { useTranslations } from "next-intl"` → `const t = useTranslations("namespace")`
- 클라이언트 컴포넌트: 동일 (next-intl은 클라이언트/서버 모두 지원)
- 링크: `import { Link } from "@/i18n/navigation"` (locale 자동 prefix)
- 메시지 추가 시 `messages/ko.json`, `messages/en.json`, `messages/ja.json` 모두 업데이트

## 화면 구성 (바텀 내비게이션 3개 탭)

| 탭 | 경로 | 아이콘 | 역할 |
|---|---|---|---|
| RESERVED | /reserved | 티켓 아이콘 | 예약한(구매한) 티켓 목록 |
| MY TICKETS | /my-tickets | 티켓+체크 아이콘 | 내가 발급한 티켓 관리 (운영자) |
| PROFILE | /profile | 유저 아이콘 | 마이페이지 (설정, 로그아웃) |

## 티켓 상태값

```typescript
type TicketStatus =
  | "BEFORE_USE"    // 사용 전
  | "WAITING"       // 순서 대기중
  | "MY_TURN"       // 현재 순서임
  | "USED"          // 사용 완료
```

## 발급 티켓 상태값 (운영자)

```typescript
type IssueStatus =
  | "ISSUING"       // 티켓 발급중
  | "INACTIVE"      // 비활성화
  | "EXPIRED"       // 기간만료
  | "VERIFYING"     // 티켓 검표중
```

## 푸시 알림

- `PushNotification` 컴포넌트: 구독/해제 토글 UI
- 마이페이지 "푸시 알림 설정" 토글과 연동
- VAPID 키 필요: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

## 주요 패턴

- 모바일 퍼스트: 기본 스타일은 모바일, `sm:` / `lg:` 로 데스크톱 대응
- 바텀 내비: 모바일에서는 하단 fixed, 데스크톱에서는 상단 혹은 숨김
- 카드 UI: `bg-white rounded-2xl` 섹션 카드
- 토글: Tailwind 커스텀 or 네이티브 checkbox 스타일링
