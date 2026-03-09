# PERFO 티켓팅 시스템 아키텍처 가이드

> 작업 순서대로 정리된 개발 가이드

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [Phase 1: Docker Compose 설정](#3-phase-1-docker-compose-설정)
4. [Phase 2: NextAuth 소셜 로그인](#4-phase-2-nextauth-소셜-로그인)
5. [Phase 3: Kafka/Redis 티켓팅](#5-phase-3-kafkaredis-티켓팅)
6. [Phase 4: WebSocket 실시간 통신](#6-phase-4-websocket-실시간-통신)
7. [Phase 5: QR 코드 시스템](#7-phase-5-qr-코드-시스템)
8. [Phase 6: 반응형 UI](#8-phase-6-반응형-ui)
9. [Phase 7: 배포](#9-phase-7-배포)
10. [Phase 8: 보안 설정](#10-phase-8-보안-설정)
11. [Phase 9: PWA 푸시 알림](#11-phase-9-pwa-푸시-알림)

### 📚 관련 문서
- [PWA 푸시 알림 가이드](./PWA_PUSH_GUIDE.md)
- [윈도우 서버 배포 가이드](./WINDOWS_SERVER_GUIDE.md)


---

## 1. 프로젝트 개요

온라인 티켓팅 + 오프라인 QR 인증이 가능한 모바일 퍼스트 티켓팅 플랫폼

### 핵심 기능
- **티켓팅**: Kafka + Redis 기반 대기열 처리 (WebSocket 실시간 상태)
- **인증**: QR 코드 기반 오프라인 티켓 검증
- **로그인**: NextAuth 소셜 로그인 (Google, Kakao, Naver, Line)
- **UI/UX**: 모바일 반응형 중심
- **데이터베이스**: PostgreSQL

### 시스템 아키텍처

```mermaid
graph TB
    subgraph Client["클라이언트"]
        UI[Next.js Frontend]
        WS[WebSocket Client]
    end
    
    subgraph Backend["백엔드"]
        API[Next.js API Routes]
        WSServer[WebSocket Server]
    end
    
    subgraph Queue["메시지 큐"]
        Kafka[Kafka] --> Consumer[Consumer]
    end
    
    subgraph Storage["저장소"]
        Redis[Redis]
        DB[(PostgreSQL)]
    end
    
    UI --> API
    WS <--> WSServer
    API --> Kafka
    Consumer --> Redis
    Consumer --> WSServer
    API --> DB
```

---

## 2. 프로젝트 구조

```
PERFO/
├── app/
│   ├── (auth)/login/
│   ├── (main)/
│   │   ├── events/
│   │   ├── tickets/
│   │   └── ticketing/
│   ├── (admin)/verify/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── tickets/
│       ├── ticketing/
│       └── ws/
├── components/
│   ├── ui/
│   ├── ticketing/
│   ├── qr/
│   └── auth/
├── lib/
│   ├── auth/
│   ├── kafka/
│   ├── redis/
│   └── db/
├── docker/
│   └── docker-compose.yml
└── workers/
    └── ticketing-consumer.ts
```

---

## 3. Phase 1: Docker Compose 설정

### 3.1 필수 패키지 설치

```bash
pnpm add prisma @prisma/client kafkajs ioredis
```

### 3.2 docker-compose.yml

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: perfo
      POSTGRES_PASSWORD: perfo123
      POSTGRES_DB: perfo
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

### 3.3 실행

```bash
cd docker
docker-compose up -d
docker-compose ps  # 상태 확인
```

### 3.4 Prisma 초기화

```bash
pnpm prisma init
# DATABASE_URL="postgresql://perfo:perfo123@localhost:5432/perfo"
pnpm prisma db push
```

---

## 4. Phase 2: NextAuth 소셜 로그인

### 4.1 패키지 설치

```bash
pnpm add next-auth
```

### 4.2 환경변수 (.env.local)

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Kakao
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# Naver
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Line
LINE_CLIENT_ID=
LINE_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://perfo:perfo123@localhost:5432/perfo
```

### 4.3 Auth 설정 (lib/auth/auth.config.ts)

```typescript
import GoogleProvider from "next-auth/providers/google"
import KakaoProvider from "next-auth/providers/kakao"
import NaverProvider from "next-auth/providers/naver"
import LineProvider from "next-auth/providers/line"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
}
```

### 4.4 OAuth Client ID/Secret 발급

#### Google
1. **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)** → OAuth 2.0 Client ID
2. Callback: `/api/auth/callback/google`

#### Kakao
1. **[Kakao Developers](https://developers.kakao.com/console/app)** → 내 애플리케이션 → 앱 키 (REST API 키)
2. 보안 메뉴에서 Client Secret 생성
3. Callback: `/api/auth/callback/kakao`

#### Naver
1. **[Naver Developers](https://developers.naver.com/apps/#/list)** → Application → 애플리케이션 등록
2. Callback: `/api/auth/callback/naver`

#### Line
1. **[Line Developers Console](https://developers.line.biz/console/)** → Providers → LINE Login channel
2. Channel ID (Client ID), Channel Secret 발급
3. Callback: `/api/auth/callback/line`

---

## 5. Phase 3: Kafka/Redis 티켓팅

### 5.1 티켓 발급 정책

```typescript
interface TicketEvent {
  id: string
  totalTickets: number              // 총 N개 발행
  allowDuplicatePurchase: boolean   // 중복 구매 허용 (기본: false)
  maxTicketsPerUser: number         // 1인당 최대 수량 (기본: 1)
}
```

### 5.2 Kafka Producer (티켓팅 요청)

```typescript
// lib/kafka/producer.ts
import { Kafka } from 'kafkajs'

const kafka = new Kafka({ brokers: ['localhost:9092'] })
const producer = kafka.producer()

export async function produceTicketingRequest(data: {
  userId: string
  eventId: string
  requestId: string
}) {
  await producer.send({
    topic: 'ticketing-requests',
    messages: [{ value: JSON.stringify(data) }],
  })
}
```

### 5.3 Kafka Consumer (처리)

```typescript
// workers/ticketing-consumer.ts
const consumer = kafka.consumer({ groupId: 'ticketing-group' })

await consumer.subscribe({ topic: 'ticketing-requests' })
await consumer.run({
  eachMessage: async ({ message }) => {
    const { userId, eventId, requestId } = JSON.parse(message.value.toString())
    // Redis에서 재고 확인 → DB 저장 → WebSocket 알림
  },
})
```

### 5.4 Redis 재고 관리

```typescript
// lib/redis/inventory.ts
import Redis from 'ioredis'

const redis = new Redis()

export async function decrementStock(eventId: string): Promise<boolean> {
  const remaining = await redis.decr(`stock:${eventId}`)
  return remaining >= 0
}
```

---

## 6. Phase 4: WebSocket 실시간 통신

### 6.1 패키지 설치

```bash
pnpm add ws
pnpm add -D @types/ws
```

### 6.2 상태 정의

```typescript
type TicketingStatus = 
  | "PENDING"      // 대기 중
  | "PROCESSING"   // 처리 중
  | "SUCCESS"      // 성공
  | "FAILED"       // 실패 (재시도 가능)
  | "SOLD_OUT"     // 매진
  | "DUPLICATE"    // 중복 구매 불가
```

### 6.3 통신 전략

| 기능 | 방식 | 이유 |
|------|------|------|
| 티켓팅 상태 | **WebSocket** | 실시간 필요 |
| 이벤트/티켓 목록 | Polling | 갱신 빈도 낮음 |
| QR 검증 | HTTP | 단발성 요청 |

---

## 7. Phase 5: QR 코드 시스템

### 7.1 패키지 설치

```bash
pnpm add html5-qrcode qrcode @types/qrcode
```

### 7.2 QR 생성

```typescript
import QRCode from 'qrcode'

interface TicketQRData {
  ticketId: string
  eventId: string
  userId: string
  signature: string  // HMAC 서명
}

const qrDataUrl = await QRCode.toDataURL(JSON.stringify(data))
```

### 7.3 QR 스캔 (모바일)

```typescript
import { Html5QrcodeScanner } from 'html5-qrcode'

const scanner = new Html5QrcodeScanner("reader", { fps: 10 })
scanner.render(onSuccess, onError)
```

---

## 8. Phase 6: 반응형 UI

### 8.1 모바일 퍼스트 Breakpoints

```css
/* 기본: 모바일 (< 640px) */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
```

### 8.2 핵심 고려사항

| 요소 | 모바일 | 데스크톱 |
|------|--------|----------|
| 네비게이션 | 하단 탭 바 | 상단 바 |
| 버튼 | 최소 48px | 표준 |
| 폰트 | 16px+ | 표준 |
| QR 스캐너 | 전체 화면 | 모달 |

---

## 9. Phase 7: 배포

### 9.1 AWS 배포

| 컴포넌트 | AWS 서비스 |
|----------|-----------|
| App | ECS Fargate |
| Kafka | Amazon MSK |
| Redis | ElastiCache |
| DB | RDS PostgreSQL |
| LB | ALB |
| CDN | CloudFront |

**예상 비용**: 최소 ~$265/월, 프로덕션 ~$837/월

### 9.2 온프레미스 배포

```nginx
# Nginx WebSocket 설정
location /api/ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 10. Phase 8: 보안 설정

### 10.1 체크리스트

- [ ] HTTPS 강제 (TLS 1.2+)
- [ ] 방화벽: 443만 외부 오픈
- [ ] 내부 서비스 격리 (DB, Redis, Kafka)
- [ ] Rate Limiting 적용
- [ ] CORS 설정
- [ ] 환경변수 암호화 (Secrets Manager)

### 10.2 Rate Limiting

```typescript
import { Ratelimit } from "@upstash/ratelimit"

const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})
```

---

## 11. Phase 9: PWA 푸시 알림

모바일 웹에서도 푸시 알림을 받을 수 있도록 PWA 설정.

> **상세 가이드**: [PWA_PUSH_GUIDE.md](./PWA_PUSH_GUIDE.md) 참조

### 11.1 구현된 파일

```
public/
├── manifest.json      # PWA 매니페스트
└── sw.js              # Service Worker
lib/push/
├── config.ts          # VAPID 설정
└── server.ts          # 푸시 발송 유틸
app/api/push/
├── subscribe/route.ts # 구독 API
└── send/route.ts      # 발송 API
components/push/
└── PushNotification.tsx
```

### 11.2 사용 예시

```tsx
import { PushNotification } from '@/components/push/PushNotification';

// 페이지에 알림 구독 버튼 추가
<PushNotification />

// 서버에서 푸시 발송
import { sendPushNotification } from '@/lib/push/server';
await sendPushNotification(subscription, {
  title: '티켓팅 성공!',
  body: '좌석이 배정되었습니다.',
  url: '/tickets/123'
});
```

### 11.3 플랫폼 지원

| 플랫폼 | 지원 |
|--------|------|
| Android Chrome | ✅ |
| iOS Safari (PWA) | ✅ 16.4+ |
| iOS Safari (브라우저) | ❌ |
| Desktop | ✅ |

---

## 필요한 패키지 요약

```bash
# Core
pnpm add next-auth kafkajs ioredis prisma @prisma/client

# WebSocket
pnpm add ws && pnpm add -D @types/ws

# QR
pnpm add html5-qrcode qrcode @types/qrcode

# Push Notification (PWA)
pnpm add web-push && pnpm add -D @types/web-push

# Rate Limiting (선택)
pnpm add @upstash/ratelimit @upstash/redis
```
