# Lighthouse 개선 계획

작성일: 2026-05-22
측정 URL: `https://perfo.amaneta.me/en/my-tickets`
Lighthouse 버전: 13.0.2 (모바일 에뮬레이션)

## 현황 요약

| 카테고리 | 현재 점수 | 목표 |
|---|---|---|
| Performance | **84** | ≥ 90 |
| Accessibility | **89** | ≥ 95 |
| Best Practices | 100 | 유지 |
| SEO | **66** | ≥ 85 |

---

## 1. Performance (84 → 90+)

### 1-1. LCP 개선 — 4.2s → 2.5s 이하 (우선순위: Critical)

**현황**
- LCP 요소: `<img src="/api/tickets/{id}/image">` (`components/tickets/IssuedTicketCard.tsx:70`)
- 전체 LCP 4,231ms 중 구성:
  - TTFB: 938ms
  - 리소스 로드 지연: **1,364ms** ← 주 병목
  - 리소스 로드 시간: 449ms
  - 요소 렌더링 지연: 26ms
- 페이지 전체가 `"use client"` 컴포넌트이므로, LCP 이미지가 초기 HTML에 없음 → 브라우저가 JS 실행 후에야 이미지 URL을 알 수 있음 (`requestDiscoverable: false`)
- `fetchpriority="high"` 미적용

**조치 방향**

1. **`fetchpriority` 추가** (빠른 효과, 파일 1개 수정)
   - `IssuedTicketCard.tsx:70`의 `<img>`에 `fetchpriority="high"` 추가
   - 단, 목록 첫 번째 카드에만 적용해야 하므로 prop으로 전달 필요 (`isLCP?: boolean`)

2. **LCP 이미지 preload** (빠른 효과)
   - my-tickets 페이지 레이아웃 또는 `<head>`에 첫 번째 티켓 이미지에 대한 `<link rel="preload">` 삽입
   - 서버 사이드에서 첫 티켓 imageUrl을 fetch한 뒤 `generateMetadata` 또는 layout에서 주입

3. **페이지 하이브리드 전환** (효과 크지만 공수 큼)
   - `my-tickets/page.tsx`를 Server Component로 전환하고, 첫 번째 티켓 카드만 SSR로 렌더링
   - 이후 인터랙션(필터, 무한스크롤 등)은 클라이언트 컴포넌트로 분리

> **권장 단기 조치:** 조치 1 (fetchpriority) + 조치 2 (preload) 병행. 조치 3은 다음 리팩터링 사이클에 검토.

---

### 1-2. 서버 응답 시간 단축 — 640ms → 200ms 이하 (우선순위: High)

**현황**
- `https://perfo.amaneta.me/en/my-tickets` 초기 문서 응답에 641ms 소요
- Lighthouse 기준: 600ms 초과 시 fail

**조치 방향**

1. **Next.js route 응답 캐싱 확인**
   - `app/[locale]/(main)/my-tickets/page.tsx` 또는 관련 `fetch` 호출에 `cache`, `revalidate` 옵션 설정 검토
   - 인증 페이지이므로 퍼블릭 캐시는 불가하나, CDN 캐시가 아닌 서버 측 메모이제이션 적용 가능

2. **백엔드 API 지연 원인 파악**
   - `frontend/app/api/tickets/` 경로 API route가 백엔드 서버를 호출하는 구조이므로, Spring 측 `/issued-tickets` 조회 쿼리 성능 확인
   - N+1 쿼리 여부 점검 (기존 `05_SECURITY_PERFORMANCE_AUDIT.md`에서 지적된 사항과 연계)

3. **Cold start 최소화**
   - Vercel/컨테이너 환경에서 SSR 함수 warm-up 여부 확인

---

### 1-3. 이미지 최적화 — 66KiB 절감 (우선순위: High)

**현황**
- `IssuedTicketCard.tsx:70`: raw `<img>` 태그 사용으로 Next.js Image 최적화 미적용
- `/api/tickets/{id}/image`가 원본 크기 그대로 반환 (표시 크기 370×178px 대비 과도한 용량)

**조치 방향**

1. **백엔드 이미지 API에서 WebP/AVIF 변환 제공**
   - Spring 측 이미지 엔드포인트에 `Accept` 헤더 기반 포맷 협상 추가
   - 또는 응답 시 MinIO에서 가져온 원본을 WebP로 변환 후 반환

2. **Next.js Image 컴포넌트 전환 검토**
   - 현재 `eslint-disable @next/next/no-img-element` 주석이 있어 의도적으로 `<img>` 사용 중
   - `/api/tickets/{id}/image`는 동적 외부 URL이 아닌 내부 API 경로이므로 `next.config.ts`에 `images.remotePatterns` 추가 후 `<Image>` 전환 가능
   - 단, height/width를 정해야 하므로 `fill` 모드 사용 (`object-cover`와 동일 동작)

3. **썸네일 엔드포인트 분리**
   - 목록 카드용 저해상도 썸네일 API를 별도로 만들고, 카드에서는 썸네일만 로드
   - 예: `/api/tickets/{id}/image?size=thumbnail`

---

### 1-4. 사용하지 않는 JavaScript 감소 — 25KiB 절감 (우선순위: Medium)

**현황**
- `/_next/static/chunks/0s1zo3skb~qai.js` (72KiB 중 25KiB = 36% 미사용)

**조치 방향**
- 해당 chunk에 포함된 라이브러리 확인 (`next build --analyze` 또는 `@next/bundle-analyzer`)
- 사용 빈도 낮은 컴포넌트 (예: BottomSheet, 지도 자동완성 등)는 `dynamic(() => import(...), { ssr: false })`로 lazy loading

---

### 1-5. 레거시 JavaScript 제거 — 13KiB 절감 (우선순위: Medium)

**현황**
- 같은 chunk에 `Array.prototype.at`, `Array.prototype.flat`, `Array.prototype.flatMap` polyfill 포함
- 현재 브라우저 지원 대상이 지나치게 넓게 설정된 것으로 추정

**조치 방향**
- `frontend/package.json`의 `browserslist` 또는 `next.config.ts`에서 지원 브라우저 범위를 현대 브라우저로 좁히기
  ```
  "> 0.5%, last 2 versions, not dead, not ie 11"
  ```
- `Array.prototype.at`는 Chrome 92+, Safari 15.4+ 지원이므로 2023년 이후 출시 기기에서는 불필요

---

### 1-6. 렌더링 차단 CSS — 270ms 절감 (우선순위: Medium)

**현황**
- `/_next/static/chunks/0vcwg18cg3mzv.css` (11.7KiB)가 렌더 차단 리소스로 감지됨
- Next.js는 기본적으로 CSS를 `<link rel="stylesheet">`로 주입하므로 렌더 차단 발생 가능

**조치 방향**
- 크리티컬 CSS(above-the-fold)를 인라인으로 추출하는 방식 검토
- Next.js에서는 `app/globals.css`의 불필요한 CSS import 줄이기
- Tailwind JIT 모드에서 사용하지 않는 유틸리티 클래스가 포함되지 않는지 확인

---

### 1-7. bfcache 차단 해제 (우선순위: Low)

**현황**
- `cache-control: no-store` 헤더로 인해 뒤로-앞으로 캐시(bfcache) 미작동
- 인증 세션 쿠키가 있는 페이지는 구조적으로 no-store가 필요한 경우가 많음

**조치 방향**
- 페이지 응답 자체에 no-store를 강제하는 미들웨어/헤더 설정이 있는지 확인
- `next.config.ts`의 `headers()` 설정 검토
- 완전한 해결은 어려우나, JS 리소스 fetch 시 no-store를 불필요하게 붙이지 않도록 API route 응답 헤더 정리

---

## 2. Accessibility (89 → 95+)

### 2-1. 색상 대비 개선 (우선순위: High)

**현황**
- 대상 요소: `span.inline-flex` (VERIFYING 상태 뱃지)
- 전경색: `#9bafd9` (primary 14% + white = 매우 연한 파란색)
- 배경색: `#f1f4fa`
- 현재 대비율: **2:1** (WCAG AA 기준 일반 텍스트는 4.5:1 이상 필요)
- 관련 파일: `components/ui/badge.tsx:12`
  ```tsx
  info: "bg-[color:color-mix(in_srgb,var(--primary)_14%,white)] text-primary",
  ```

**조치 방향**
- `info` variant의 텍스트 색상을 더 진한 값으로 변경
  - `text-primary` → `text-[var(--primary-dark)]` 또는 명시적 hex 값으로 변경
  - 목표: 배경 `#f1f4fa` 기준 4.5:1 이상 확보
  - 예시: primary 색상을 `#103783`으로 고정하면 배경 `#f1f4fa` 대비 약 7.6:1 (충분)
- 또는 배경색을 더 진하게 조정 (primary 비율을 14%→25% 이상으로 올림)

> `STATUS_BADGE_STYLE`에서 `VERIFYING: "info"`를 사용하므로 (`my-tickets.constants.ts:24`), badge.tsx의 info variant 수정이 전체에 영향을 미침.

---

### 2-2. viewport 확대 허용 (우선순위: High)

**현황**
- `app/layout.tsx:70`: `maximumScale: 1`
- 생성되는 메타태그: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
- 저시력 사용자의 핀치-투-줌을 차단하여 WCAG 1.4.4 위반

**조치 방향**
- `app/layout.tsx`에서 `maximumScale: 1` 제거 또는 `maximumScale: 5`로 변경
  ```ts
  export const viewport: Viewport = {
    themeColor: [...],
    width: "device-width",
    initialScale: 1,
    // maximumScale: 1,  ← 삭제
  };
  ```
- 주의: 일부 iOS Safari에서 폼 포커스 시 자동 줌이 발생할 수 있음. 이를 방지하려면 input의 `font-size`를 `16px` 이상으로 설정하는 것이 권장됨

---

## 3. SEO (66 → 85+)

### 3-1. robots.txt 크롤링 차단 (우선순위: 검토 필요)

**현황**
- `robots.txt` 68번째 줄에서 `/en/my-tickets` 접근 차단
- `app/robots.ts`에서 의도적으로 설정된 동작:
  ```ts
  const protectedPaths = supportedLocales.flatMap((locale) => [
    ...
    `/${locale}/my-tickets`,
    ...
  ]);
  ```
- Lighthouse가 인증 필요 페이지인 `/en/my-tickets`를 테스트 대상으로 삼아 SEO 점수 하락

**판단**
- **이 설정은 의도된 동작이다.** 로그인 필요 페이지는 검색 색인이 불필요하며, 차단이 올바른 접근이다.
- Lighthouse SEO 점수를 정확히 측정하려면 **공개 페이지** (예: `/en/events/{id}`, 홈 `/`) 기준으로 재측정해야 한다.

**조치 방향 (선택적)**
- 현재 점수 66점에서 이 항목이 단독으로 기여하는 하락폭이 큼
- 공개 랜딩 페이지 Lighthouse 점수를 추가로 측정하여 실제 SEO 상태 파악 권장
- `<meta name="robots" content="noindex">` 태그를 인증 페이지에 추가하는 방식으로 robots.txt 규칙과 이중 방어 가능 (선택적)

---

## 우선순위 요약

| 우선순위 | 항목 | 예상 효과 | 관련 파일 |
|---|---|---|---|
| Critical | LCP 이미지 fetchpriority 추가 | LCP 수백ms 단축 | `IssuedTicketCard.tsx:70` |
| Critical | LCP 이미지 preload | LCP 리소스 발견 지연 제거 | `my-tickets page/layout` |
| High | viewport maximumScale 제거 | Accessibility +11점 | `app/layout.tsx:70` |
| High | badge info 대비율 수정 | Accessibility +5점 | `components/ui/badge.tsx:12` |
| High | 이미지 최적화 (WebP) | Performance +5점, 66KiB 절감 | `IssuedTicketCard.tsx`, 백엔드 이미지 API |
| High | 서버 응답 시간 파악 | Performance LCP TTFB 단축 | 백엔드 쿼리, Next.js route |
| Medium | 미사용 JS / 레거시 폴리필 제거 | Performance +3점, 38KiB 절감 | `next.config.ts`, browserslist |
| Low | bfcache 헤더 정리 | 뒤로가기 UX 개선 | `next.config.ts` headers |
| 검토 | robots.txt 차단 (의도된 동작) | Lighthouse 재측정 방법 변경 | `app/robots.ts` |
