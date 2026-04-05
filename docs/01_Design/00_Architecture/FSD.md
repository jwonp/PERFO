# PERFO Frontend — FSD (Feature-Sliced Design) 아키텍처 가이드

> Next.js App Router 환경에 맞게 조정된 FSD 규칙
> 이 문서는 현재 코드의 단순 스냅샷이 아니라, 앞으로 수렴해야 할 목표 구조를 먼저 정의한다.
> 현재 코드와 차이가 있더라도 새 코드와 수정되는 코드부터 이 구조를 기준으로 맞춘다.

---

## 1. 레이어 구조

```
frontend/
├── app/                        # [Next.js] 라우팅 전용 (FSD pages 레이어)
│   ├── [locale]/
│   │   ├── (auth)/
│   │   └── (main)/
│   └── api/
│
└── src/                        # FSD 레이어
    ├── widgets/                # 복합 UI 블록 (features + entities 조합)
    ├── features/               # 사용자 인터랙션 / 비즈니스 로직 단위
    ├── entities/               # 비즈니스 엔티티 (티켓, 유저, 이벤트)
    └── shared/                 # 재사용 가능한 공통 요소
```

---

## 2. 레이어별 책임

### `app/` — 라우팅 (Next.js 전담)
- Next.js 페이지(`page.tsx`), 레이아웃(`layout.tsx`), API 라우트만 둔다
- 비즈니스 로직, UI 컴포넌트를 직접 작성하지 않는다
- 페이지는 `widgets` 또는 `features` 를 조합하는 역할만 한다

```tsx
// app/[locale]/(main)/reserved/page.tsx  ← 이렇게만
import { ReservedTicketList } from "@/widgets/ticket-list";
export default function ReservedPage() {
  return <ReservedTicketList />;
}
```

---

### `widgets/` — 복합 UI 블록
- 여러 `features` 또는 `entities` 를 조합한 독립적인 UI 덩어리
- 특정 페이지에 종속되지 않아야 한다

```
src/widgets/
├── ticket-list/            # 티켓 목록 (필터 토글 + 그리드)
│   ├── ui/TicketList.tsx
│   └── index.ts
├── ticket-form/            # 티켓 발급/수정 바텀 시트
│   ├── ui/TicketFormSheet.tsx
│   └── index.ts
└── nav/                    # 사이드바 + 바텀 내비
    ├── ui/Sidebar.tsx
    ├── ui/BottomNav.tsx
    └── index.ts
```

---

### `features/` — 사용자 인터랙션 단위
- 하나의 사용자 액션 또는 비즈니스 플로우를 담당
- 같은 레이어의 다른 feature를 import하지 않는다

```
src/features/
├── auth/                   # 로그인 / 로그아웃
│   ├── ui/LogoutButton.tsx
│   └── index.ts
├── push-notification/      # 푸시 알림 구독/해제
│   ├── ui/PushToggle.tsx
│   ├── api/subscribe.ts
│   └── index.ts
├── qr-scan/                # QR 스캔 (검표)
│   ├── ui/QRScanner.tsx
│   └── index.ts
└── ticket-filter/          # 티켓 필터링 (사용 완료만 보기 등)
    ├── ui/UsedOnlyToggle.tsx
    ├── model/useTicketFilter.ts
    └── index.ts
```

---

### `entities/` — 비즈니스 엔티티
- 도메인 모델(타입), API 호출, 엔티티 단위 UI 컴포넌트
- 순수한 비즈니스 개념만 담는다 (인터랙션 로직 X)

```
src/entities/
├── ticket/
│   ├── ui/TicketCard.tsx       # 현재 components/tickets/TicketCard.tsx
│   ├── model/ticket.types.ts   # TicketUsageStatus, TicketingStatus 등
│   ├── api/getTickets.ts
│   └── index.ts
├── user/
│   ├── ui/UserAvatar.tsx
│   ├── model/user.types.ts
│   └── index.ts
└── event/
    ├── model/event.types.ts
    ├── api/getEvents.ts
    └── index.ts
```

---

### `shared/` — 공통 요소
- 도메인 지식 없는 범용 코드만 둔다
- 어느 레이어에서도 import 가능

```
src/shared/
├── ui/                     # 현재 components/ui/ (shadcn 컴포넌트)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── label.tsx
├── lib/
│   ├── utils.ts            # 현재 lib/lib/utils.ts
├── i18n/                   # 현재 i18n/
│   ├── routing.ts
│   ├── navigation.ts
│   └── request.ts
├── config/
│   └── auth.config.ts      # 현재 lib/auth/auth.config.ts
└── types/                  # 현재 types/
    ├── next-auth.d.ts
    └── routes.d.ts
```

### `server/` — Next.js server-only 인프라
- 브라우저 번들에 포함되면 안 되는 서버 전용 코드를 둔다
- Next.js Route Handler, Server Action, 서버 전용 인프라 어댑터를 관리한다
- 프론트엔드 저장소 안에 있더라도 브라우저 공용 `shared`와는 엄격히 분리한다

```
src/server/
├── infra/
│   ├── redis/              # 현재 lib/redis/
│   ├── push/               # 현재 lib/push/
│   └── messaging/          # Kafka 등 메시징 어댑터
├── auth/
│   └── token/
└── index.ts
```

---

## 3. Import 규칙

레이어 간 의존성은 **위에서 아래 방향만** 허용한다.

```
app  →  widgets  →  features  →  entities  →  shared
```

| 금지 사례 | 이유 |
|---|---|
| `entities`에서 `features` import | 하위 레이어가 상위를 알면 안 됨 |
| `features`에서 다른 `features` import | 슬라이스 간 직접 참조 금지 |
| `shared`에서 `entities` import | shared는 도메인 무관해야 함 |
| `widgets`에서 `app/` import | 라우팅 역방향 의존 |

**같은 레이어 내 슬라이스 간 import도 금지.**
필요하면 `shared`로 내리거나 `widgets`로 올린다.

---

## 4. Public API 규칙

각 슬라이스는 반드시 `index.ts`를 통해서만 외부에 노출한다.

```ts
// src/entities/ticket/index.ts
export { TicketCard } from "./ui/TicketCard";
export type { TicketUsageStatus, TicketingStatus } from "./model/ticket.types";
```

```ts
// 사용하는 쪽
import { TicketCard, type TicketUsageStatus } from "@/entities/ticket";
// ❌ import { TicketCard } from "@/entities/ticket/ui/TicketCard" — 내부 직접 접근 금지
```

---

## 5. 현재 구조 → FSD 마이그레이션 매핑

| 현재 경로 | 이동할 경로 |
|---|---|
| `components/ui/` | `src/shared/ui/` |
| `components/tickets/TicketCard.tsx` | `src/entities/ticket/ui/TicketCard.tsx` |
| `components/auth/LogoutButton.tsx` | `src/features/auth/ui/LogoutButton.tsx` |
| `components/push/PushNotification.tsx` | `src/features/push-notification/ui/PushToggle.tsx` |
| `components/providers/SessionProvider.tsx` | `src/shared/providers/SessionProvider.tsx` |
| `lib/auth/auth.config.ts` | `src/shared/config/auth.config.ts` |
| `lib/push/` | `src/server/infra/push/` |
| `lib/kafka/` | `src/server/infra/messaging/` |
| `lib/redis/` | `src/server/infra/redis/` |
| `lib/lib/utils.ts` | `src/shared/lib/utils.ts` |
| `i18n/` | `src/shared/i18n/` |
| `types/` | `src/shared/types/` |
| `app/[locale]/(main)/reserved/page.tsx` 내 UI 로직 | `src/widgets/ticket-list/` |
| `app/[locale]/(main)/my-tickets/page.tsx` 내 폼 | `src/widgets/ticket-form/` |
| `app/[locale]/(main)/layout.tsx` 내 내비 | `src/widgets/nav/` |

---

## 6. 세그먼트 구조

각 슬라이스 내부 폴더 역할:

| 세그먼트 | 내용 |
|---|---|
| `ui/` | React 컴포넌트 |
| `model/` | 타입, Zustand/상태 훅, 유틸 |
| `api/` | 서버 요청 함수 |
| `lib/` | 슬라이스 전용 순수 함수 |
| `config/` | 상수, 설정값 |
| `index.ts` | Public API (필수) |

---

## 7. 적용 우선순위

지금 당장 전체를 옮기지 않고 새 코드부터 FSD로 작성한다.

1. **즉시 적용**: 새 컴포넌트/기능은 FSD 경로에 작성
2. **단계적 이전**: 기능 수정이 생길 때 해당 파일을 FSD 위치로 이동
3. **일괄 이전 금지**: 리팩토링 PR을 기능 PR과 섞지 않는다

## 8. 경계 원칙

- 프론트엔드 문서 범위는 Next.js 전반으로 본다.
- 백엔드 문서 범위는 Spring 전반으로 분리해서 관리한다.
- `shared/`에는 브라우저와 서버가 공통으로 써도 되는 범용 코드만 둔다.
- Redis, Kafka, 푸시 발송처럼 server-only 성격의 모듈은 `server/` 아래로 분리한다.
- 새 코드는 목표 구조를 반드시 따른다.
- 기존 코드는 수정이 발생한 시점에 점진적으로 목표 구조로 이동한다.
