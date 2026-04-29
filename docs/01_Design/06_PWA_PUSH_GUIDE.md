# PWA 푸시 알림 유지보수 가이드

> 모바일 웹 푸시 알림 구현 및 유지보수를 위한 종합 가이드  
> 이 문서는 푸시 기능 자체의 구현과 운영을 다루며, 특정 메시지 브로커나 비동기 처리 방식에 종속되지 않는다.

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [파일 구조](#2-파일-구조)
3. [환경변수 설정](#3-환경변수-설정)
4. [사용 방법](#4-사용-방법)
5. [티켓팅 시스템 연동](#5-티켓팅-시스템-연동)
6. [트러블슈팅](#6-트러블슈팅)
7. [플랫폼 지원](#7-플랫폼-지원)

---

## 1. 아키텍처 개요

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   브라우저       │────▶│   Next.js API   │────▶│   web-push     │
│  (Service Worker)│     │  /api/push/*    │     │   (서버)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        │                                                ▼
        │                                     ┌─────────────────┐
        └────────────────────────────────────│   푸시 서비스    │
                     푸시 수신                │  (FCM, APNS)    │
                                             └─────────────────┘
```

**흐름:**

1. 사용자가 `PushNotification` 컴포넌트에서 "알림 받기" 클릭
2. 브라우저가 알림 권한 요청 → Service Worker 등록 → 푸시 구독
3. 구독 정보가 `/api/push/subscribe`로 전송되어 저장
4. 서버에서 `sendPushNotification()` 호출 시 사용자에게 알림 전송

---

## 2. 파일 구조

```
PERFO/
├── public/
│   ├── manifest.json         # PWA 매니페스트
│   └── sw.js                 # Service Worker (푸시 수신)
├── lib/push/
│   ├── config.ts             # VAPID 키 설정, 타입 정의
│   └── server.ts             # 푸시 발송 유틸리티
├── app/api/push/
│   ├── subscribe/route.ts    # 구독 저장/삭제 API
│   └── send/route.ts         # 푸시 발송 API
└── components/push/
    └── PushNotification.tsx  # 구독 UI 컴포넌트
```

---

## 3. 환경변수 설정

`.env.local`에 다음 환경변수가 필요합니다:

```env
# 공개키 (클라이언트에서 사용)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BD6s3w5V..."

# 비밀키 (서버에서만 사용)
VAPID_PRIVATE_KEY="Sofbup8q..."
```

### VAPID 키 재생성

보안상 키를 변경해야 할 경우:

```bash
npx web-push generate-vapid-keys --json
```

> ⚠️ **주의**: 키를 변경하면 기존 구독자들은 모두 재구독해야 합니다.

---

## 4. 사용 방법

### 4.1 컴포넌트 사용

```tsx
import { PushNotification } from "@/components/push/PushNotification";

export default function Page() {
  return (
    <div>
      <PushNotification />
    </div>
  );
}
```

### 4.2 서버에서 푸시 발송

```typescript
import { sendPushNotification } from "@/lib/push/server";

// 구독 정보 (DB에서 조회)
const subscription = {
  endpoint: "https://fcm.googleapis.com/...",
  keys: {
    p256dh: "...",
    auth: "...",
  },
};

// 푸시 발송
await sendPushNotification(subscription, {
  title: "티켓팅 성공! 🎉",
  body: "좌석이 배정되었습니다.",
  url: "/tickets/12345",
});
```

### 4.3 여러 사용자에게 발송

```typescript
import { sendPushToMany } from '@/lib/push/server';

const subscriptions = [...]; // DB에서 조회
const { success, failed } = await sendPushToMany(subscriptions, {
  title: '공연 오픈 알림',
  body: '지금 바로 예매하세요!'
});
```

---

## 5. 티켓팅 시스템 연동

티켓팅 결과가 확정되면 알림 서비스 계층에서 푸시를 발송한다.

- 초기 구조에서는 API 서버 또는 애플리케이션 서비스에서 직접 호출할 수 있다.
- 확장 구조에서는 비동기 워커, 이벤트 소비자, 메시지 브로커 뒤에서 호출할 수 있다.
- 중요한 것은 푸시 발송이 `도메인 이벤트` 또는 `알림 서비스 인터페이스`를 기준으로 동작해야 한다는 점이다.

예시:

```typescript
import { sendPushNotification } from "@/lib/push/server";

// 티켓팅 성공 시
if (ticketingResult.status === "SUCCESS") {
  const subscription = await getUserPushSubscription(userId);
  if (subscription) {
    await sendPushNotification(subscription, {
      title: "티켓팅 성공! 🎉",
      body: `${eventName} 좌석이 배정되었습니다.`,
      url: `/tickets/${ticketId}`,
    });
  }
}
```

즉 푸시 시스템은 Kafka에 종속되지 않고, 티켓팅 성공/실패 같은 도메인 이벤트에 반응하는 구조로 유지하는 것이 맞다.

---

## 6. 트러블슈팅

### ❌ "VAPID 공개키가 설정되지 않았습니다"

**원인:** 환경변수가 설정되지 않음

**해결:**

1. `.env.local`에 VAPID 키 확인
2. 개발 서버 재시작 (`pnpm dev`)

### ❌ Service Worker 등록 실패

**원인:** HTTPS가 아닌 환경에서 실행

**해결:**

- localhost는 HTTPS 없이 동작
- 배포 환경에서는 반드시 HTTPS 필요

### ❌ iOS에서 알림이 안 됨

**원인:** iOS Safari 브라우저에서는 푸시 미지원

**해결:**

1. 사용자에게 "홈 화면에 추가" 안내
2. PWA로 실행해야 푸시 가능 (iOS 16.4+)

### ❌ 푸시 발송 실패 (410 Gone)

**원인:** 구독이 만료되었거나 사용자가 해제함

**해결:**

```typescript
try {
  await sendPushNotification(subscription, payload);
} catch (error) {
  if (error.statusCode === 410) {
    // DB에서 구독 정보 삭제
    await deleteSubscription(subscription.endpoint);
  }
}
```

---

## 7. 플랫폼 지원

| 플랫폼    | 브라우저            | 푸시 지원          |
| --------- | ------------------- | ------------------ |
| Android   | Chrome              | ✅ 완전 지원       |
| Android   | Firefox             | ✅ 완전 지원       |
| Android   | Samsung Internet    | ✅ 완전 지원       |
| iOS 16.4+ | Safari (PWA)        | ✅ 홈 화면 추가 시 |
| iOS       | Safari (브라우저)   | ❌ 미지원          |
| Desktop   | Chrome/Firefox/Edge | ✅ 완전 지원       |

### iOS PWA 설치 안내 UI 예시

```tsx
function IOSInstallPrompt() {
  const isIOS = /iPad|iPhone/.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  if (!isIOS || isStandalone) return null;

  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <p>알림을 받으려면 홈 화면에 추가하세요:</p>
      <p>Safari 하단 공유 버튼 → "홈 화면에 추가"</p>
    </div>
  );
}
```

---

## 8. 홈 화면에 추가 (Add to Home Screen) 구현

### 8.1 자동 프롬프트 (Android)

Android Chrome에서는 `beforeinstallprompt` 이벤트를 사용하여 사용자에게 자동으로 설치를 권장할 수 있습니다.

```tsx
"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 설치되었는지 확인
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // beforeinstallprompt 이벤트 리스너 (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // 설치 프롬프트 표시
    await deferredPrompt.prompt();

    // 사용자 선택 결과 대기
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("사용자가 PWA 설치를 수락했습니다");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  // 이미 설치되었거나 프롬프트가 없으면 버튼 숨김
  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      앱 설치하기
    </button>
  );
}
```

### 8.2 플랫폼 감지 및 안내 UI

iOS는 자동 프롬프트가 불가능하므로 수동 설치 안내가 필요합니다.

```tsx
"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

export function PWAInstallBanner() {
  const [platform, setPlatform] = useState<
    "ios" | "android" | "desktop" | null
  >(null);
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 이미 설치되었는지 확인
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    if (isStandalone) return;

    // 플랫폼 감지
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform("ios");
      setShowBanner(true);
    } else if (/android/i.test(userAgent)) {
      setPlatform("android");

      // Android는 beforeinstallprompt 대기
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);

      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    // 배너를 한 번만 표시 (로컬스토리지 활용)
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) setShowBanner(false);
  }, []);

  const handleInstall = async () => {
    if (platform === "android" && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowBanner(false);
        localStorage.setItem("pwa-banner-dismissed", "true");
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!showBanner || !platform) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg z-50">
      <div className="max-w-md mx-auto flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">PERFO 앱 설치</h3>

          {platform === "ios" && (
            <div className="text-sm space-y-2">
              <p>알림을 받으려면 홈 화면에 추가하세요:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>
                  Safari 하단 <Share className="inline w-4 h-4" /> 공유 버튼 탭
                </li>
                <li>
                  "홈 화면에 추가" <Plus className="inline w-4 h-4" /> 선택
                </li>
                <li>우측 상단 "추가" 버튼 탭</li>
              </ol>
            </div>
          )}

          {platform === "android" && (
            <p className="text-sm">
              빠른 접근과 푸시 알림을 받으려면 앱을 설치하세요
            </p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-2 hover:bg-white/20 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {platform === "android" && deferredPrompt && (
        <button
          onClick={handleInstall}
          className="w-full mt-3 px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
        >
          지금 설치하기
        </button>
      )}
    </div>
  );
}
```

### 8.3 설치 상태 확인 훅

```tsx
"use client";

import { useEffect, useState } from "react";

export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstallation = () => {
      // PWA로 실행 중인지 확인
      const standalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

      // iOS Safari에서 standalone 모드 확인
      const iosStandalone = (navigator as any).standalone === true;

      setIsInstalled(standalone || iosStandalone);
    };

    checkInstallation();

    // 앱이 설치되었을 때 이벤트
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
    });
  }, []);

  return isInstalled;
}

// 사용 예시
function MyComponent() {
  const isInstalled = useIsInstalled();

  return (
    <div>
      {isInstalled ? (
        <p>✅ PWA 설치 완료!</p>
      ) : (
        <p>⚠️ 홈 화면에 추가해주세요</p>
      )}
    </div>
  );
}
```

### 8.4 배치 권장사항

```tsx
// app/layout.tsx
import { PWAInstallBanner } from "@/components/push/PWAInstallBanner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
```

### 8.5 주의사항

⚠️ **iOS 제약사항**

- iOS는 `beforeinstallprompt` 이벤트를 지원하지 않음
- 사용자가 수동으로 Safari 공유 메뉴를 통해 설치해야 함
- 안내 UI만 표시 가능, 자동 프롬프트 불가

✅ **Android 장점**

- `beforeinstallprompt` 이벤트로 자동 프롬프트 가능
- 설치 버튼 클릭 시 네이티브 설치 다이얼로그 표시
- 사용자 선택 결과를 JavaScript로 추적 가능

💡 **최적화 팁**

- 배너를 닫은 사용자는 localStorage에 기록하여 재표시 방지
- 이미 설치된 사용자에게는 배너 표시 안 함
- 첫 방문이 아닌 2-3번째 방문 시 표시하여 UX 향상

---

## 부록: 알림 페이로드 옵션

```typescript
interface PushPayload {
  title: string; // 알림 제목
  body: string; // 알림 본문
  icon?: string; // 아이콘 (기본: /favicon-128.png)
  tag?: string; // 그룹 태그 (같은 태그는 덮어씀)
  url?: string; // 클릭 시 이동할 URL
}
```

---

**마지막 업데이트:** 2026-02-08
