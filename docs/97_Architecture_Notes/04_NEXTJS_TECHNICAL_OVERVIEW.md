# 04 Next.js 기술 사용 현황

PERFO 프론트엔드(`/frontend`)에서 Next.js 16 App Router 기반으로 사용하는 기능들을 실제 코드 기준으로 정리한다.

---

## 1. App Router 구조

### 루트 레이아웃 계층

```
app/
  layout.tsx                  # 루트 HTML 쉘, 메타데이터, 폰트, OG/Twitter 카드
  [locale]/
    layout.tsx                # NextIntlClientProvider + ThemeProvider + SessionProvider
    (auth)/layout.tsx         # 인증 전용 레이아웃
    (main)/layout.tsx         # 하단 탭 네비게이션 포함 메인 레이아웃
    (scanner)/layout.tsx      # QR 스캐너 전용 단순 레이아웃
```

- `[locale]` — URL 첫 세그먼트에 locale(`en`, `ja`, `ko`)을 포함하는 동적 세그먼트
- `(auth)`, `(main)`, `(scanner)` — URL에 영향 없이 레이아웃만 분리하는 **Route Groups**
- 각 그룹이 독립 레이아웃을 가지므로 인증 페이지는 탭 바 없이 렌더된다

### 특수 파일

| 파일 | 역할 |
|------|------|
| `app/global-error.tsx` | 루트 레이아웃 바깥 에러 포착 (`"use client"`) |
| `app/[locale]/error.tsx` | locale 레이아웃 이하 에러 포착, `unstable_retry` 지원 |
| `app/[locale]/unauthorized.tsx` | `authInterrupts` 실험 기능과 연동 |
| `app/[locale]/forbidden.tsx` | 403 상태 페이지 |
| `app/[locale]/not-found.tsx` | 404 상태 페이지 |
| `app/robots.ts` | `MetadataRoute.Robots` 반환, API 경로와 인증 경로를 `disallow` |
| `app/sitemap.ts` | `MetadataRoute.Sitemap` 반환, 공개 이벤트 목록을 DB에서 조회해 동적 생성 |

---

## 2. 렌더링 방식

### Server Component (기본)

- `app/[locale]/(main)/events/page.tsx` — `getPublicEvents()` 서버에서 호출 후 Client Component에 props 전달
- `generateMetadata` 함수로 locale별 OG/Twitter 메타데이터 생성

### Client Component (`"use client"`)

- `app/[locale]/(main)/reserved/page.tsx` — `useEffect` + `fetch("/api/reservations")` 로 클라이언트 사이드 데이터 로딩
- `app/[locale]/(main)/my-tickets/page.tsx` — 동일 패턴
- `app/[locale]/(main)/layout.tsx` — `usePathname()`으로 탭 활성화 감지

### Route Cache 제어

```ts
// app/api/push/public-key/route.ts
export const dynamic = "force-dynamic";
```

캐시를 원하지 않는 API 라우트에 `export const dynamic = "force-dynamic"` 명시.  
클라이언트에서 `fetch("/api/...", { cache: "no-store" })` 호출 시에도 동일 효과.

---

## 3. 국제화 (next-intl)

```ts
// next.config.ts
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
```

- **지원 locale**: `en`, `ja`, `ko` (기본값 `en`)
- `i18n/routing.ts` — `defineRouting`으로 locale 목록과 기본 locale 정의
- `i18n/request.ts` — 서버에서 요청마다 locale 검증 후 `messages/*.json` 동적 import
- `[locale]/layout.tsx` — `NextIntlClientProvider`로 클라이언트에 메시지 공급
- 컴포넌트: `useTranslations("nav")` / `useLocale()` 훅 사용

---

## 4. 인증 (next-auth v4)

파일: `lib/auth/auth.config.ts`, `app/api/auth/[...nextauth]/route.ts`

### 지원 Provider

| Provider | 방식 |
|----------|------|
| Google | OAuth |
| Naver | OAuth |
| LINE | OAuth |
| Credentials | 이메일 + 비밀번호 (백엔드 `/api/auth/login` 위임) |

### JWT 세션 전략

- `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }`
- `jwt` 콜백에서 백엔드 사용자 ID, role, profileImage 등을 토큰에 주입
- `session` 콜백에서 `session.user`에 커스텀 필드 노출
- OAuth 로그인 시 `signIn` 콜백에서 백엔드 `/api/auth/oauth`를 호출해 사용자 동기화

### authInterrupts (실험 기능)

```ts
// next.config.ts
experimental: { authInterrupts: true }
```

`unauthorized()` / `forbidden()` Next.js 내장 함수를 Route Handler에서 throw하면 `unauthorized.tsx` / `forbidden.tsx` 페이지로 자동 라우팅.

---

## 5. API Route Handler

위치: `app/api/**`

### 패턴

```ts
// lib/server/session-route.ts
export const withRequiredSessionRoute = async (unauthorizedResponse, handler) => {
    const user = await getRequiredSessionUser();
    if (!user) return unauthorizedResponse();
    return handler(user);
};
```

- 세션 필요 라우트는 `withRequiredSessionRoute` 래퍼로 인증 처리
- `withRouteErrorHandling` 래퍼로 에러 공통 처리

### 내부 서비스 간 인증 (Internal API JWT)

파일: `lib/server/internal-api-jwt.ts`

- Next.js → 백엔드 요청 시 **HMAC-SHA256 서명된 단기 JWT** 발급 (기본 TTL 30초)
- 헤더: `kid`, `iss`, `aud`, `scope` 포함
- `lib/server/backend-proxy/` — 백엔드 URL 설정 확인 + 인증 헤더 생성 추상화

### 바이너리 응답 프록시

```ts
// lib/server/backend-proxy/backend-proxy.response.ts
export const binaryFromBackendResponse = async (response, ...) => {
    const body = await response.arrayBuffer();
    return new NextResponse(body, { status, headers });
};
```

이미지 등 바이너리를 백엔드에서 그대로 클라이언트에 전달.

---

## 6. Prisma (PostgreSQL)

파일: `lib/server/prisma.ts`, `prisma/schema.prisma`

```ts
new PrismaClient({
    adapter: new PrismaPg({ connectionString: normalizedDatabaseUrl }),
})
```

- `@prisma/adapter-pg` 사용 — Edge Runtime 호환 드라이버
- `globalThis.__perfoPrisma`로 개발 환경 핫 리로드 시 커넥션 재사용
- 생성된 클라이언트: `app/generated/prisma` (커스텀 output 경로)
- **모델**: `Ticket`, `Notification`, `PushSubscription`, `NotificationDelivery`, `TicketStatusSnapshot`

---

## 7. Web Push (PWA)

### Service Worker

파일: `public/sw.js`

- `push` 이벤트 수신 → `showNotification` 호출
- `notificationclick` 이벤트 → 기존 창 포커스 또는 새 창 오픈

### manifest.json

```json
{ "display": "standalone", "start_url": "/", "theme_color": "#6366f1" }
```

PWA 설치 가능, portrait 고정.

### 서버 발송

파일: `lib/push/server.ts`, `lib/push/config.ts`

- `web-push` 라이브러리 + VAPID 키 설정
- `sendPushNotification` — 단건 발송
- `sendPushToMany` — `Promise.allSettled`로 다수 구독자에 발송, 성공/실패 집계

### 구독 관리 API

| 엔드포인트 | 역할 |
|------------|------|
| `GET /api/push/public-key` | VAPID 공개키 반환 (`force-dynamic`) |
| `POST /api/push/subscribe` | 구독 정보 저장 |
| `DELETE /api/push/subscribe` | 구독 해제 |

---

## 8. 알림 시스템

파일: `lib/notifications/`

### 저장소 이중화

| 저장소 | 구현 | 역할 |
|--------|------|------|
| JSON 파일 | `lib/server/json-store.ts` | 개발/경량 환경 |
| PostgreSQL | `lib/notifications/prisma-notification.repository.ts` | 프로덕션 |

`json-store.ts`는 `writeQueue` (Promise 체이닝)으로 동시 쓰기 직렬화.

### 서비스 레이어

- `notification-delivery.service.ts` — 활성 구독 조회 → Push 발송 → 배달 기록
- `notification-snapshot.service.ts` — 티켓 상태 스냅샷 관리 (변경 감지용)
- `notification-subscription.service.ts` — 구독 CRUD

---

## 9. Kafka 연동

파일: `lib/kafka/producer.ts`, `workers/ticketing-consumer.ts`

- **Producer**: `kafkajs` 사용, `ticketing-requests` 토픽에 티켓팅 요청 발행
- **Consumer**: `workers/ticketing-consumer.ts` — 별도 Node 프로세스로 실행
  - 메시지 수신 후 Redis 재고 확인 → DB 저장 → 알림 발송 흐름 (구현 예정)

---

## 10. Redis 연동

파일: `lib/redis/inventory.ts`

```ts
export const decrementStock = async (eventId: string): Promise<boolean> => {
    const remaining = await redis.decr(`stock:${eventId}`);
    return remaining >= 0;
};
```

`ioredis` 사용. 현재는 `DECR stock:{eventId}` 원자적 재고 차감만 구현.  
상세 내용은 `02_REDIS_USAGE.md` 참고.

---

## 11. 이미지 최적화

```ts
// next.config.ts
images: {
    remotePatterns: [
        { protocol: "https", hostname: "perfo.amaneta.me", pathname: "/api/**" },
        { protocol: "http", hostname: "localhost", pathname: "/api/**" },
    ],
},
```

`next/image`의 원격 이미지 허용 도메인을 `/api/**` 경로로 한정.

---

## 12. 번들 분석

```ts
// next.config.ts
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(...)
```

`ANALYZE=true pnpm build` 실행 시 번들 분석 리포트 생성.

---

## 13. 빌드 출력

```ts
// next.config.ts
output: "standalone"
```

Docker 배포용 standalone 빌드. `node_modules` 없이 `.next/standalone`만으로 실행 가능.

---

## 14. 테스트

| 도구 | 용도 | 설정 파일 |
|------|------|-----------|
| Vitest + jsdom | 유닛/통합 테스트 | `vitest.config.ts` |
| @testing-library/react | 컴포넌트 렌더 테스트 | `vitest.setup.ts` |
| Playwright | E2E 테스트 | `playwright.config.ts` |

- Vitest: `fileParallelism: false` — 파일 스토어(json-store) 테스트 간 충돌 방지
- Playwright: `webServer`로 `pnpm dev` 자동 기동, `reuseExistingServer: !CI`

---

## 15. 폰트

```ts
// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
```

`next/font/google`으로 Geist / Geist_Mono 로드. CSS 변수로 주입.

---

## 정리

| 기능 | 사용 방식 |
|------|----------|
| App Router | 중첩 레이아웃 + Route Groups |
| 국제화 | next-intl, URL prefix 방식 |
| 인증 | next-auth v4 JWT, 4개 Provider |
| DB | Prisma + PrismaPg (Edge 드라이버) |
| 메시징 | Kafka (kafkajs) |
| 캐시/재고 | Redis (ioredis) |
| 알림 | Web Push (web-push) + Service Worker |
| 빌드 | standalone, Bundle Analyzer 옵션 |
| 테스트 | Vitest (유닛) + Playwright (E2E) |
