# Public Event 엔드포인트 인증 오류 수정

> 관련 코드:
> `backend/src/main/kotlin/com/perfo/backend/config/SecurityConfig.kt`
> `backend/src/main/kotlin/com/perfo/backend/config/HeaderAuthenticationFilter.kt`
> `frontend/lib/events/public-events.ts`

## 1. 문제 상황

티켓 등록 후 `/events/{eventId}` 접근 시 404가 발생한다.

백엔드 로그:
```
WARN --- [perfo-backend] c.p.b.o.InternalProxyAuthObservability :
internal_proxy_auth_rejected reason=missing_token scope=tickets path=/api/events/4
```

## 2. 원인 분석

### 요청 경로

`/events/{eventId}` 페이지는 SSR로 렌더링된다. 이때 `frontend/lib/events/public-events.ts`의 `getPublicEvent()`가 백엔드에 **직접** 요청을 보낸다.

```
브라우저 → Next.js SSR
  → public-events.ts#getPublicEvent()
    → GET ${BACKEND_URL}/api/events/{eventId}  (Authorization 헤더 없음)
      → 백엔드 missing_token → 401
        → getPublicEvent() null 반환
          → notFound() → 404
```

### 구조적 불일치

`/api/events/**` 엔드포인트에 접근하는 경로가 두 가지다.

| 경로 | Authorization 헤더 | 동작 |
|------|-------------------|------|
| `app/api/events/[eventId]/route.ts` (클라이언트 요청용) | `tickets` 스코프 JWT 포함 | 정상 |
| `lib/events/public-events.ts` (SSR 공개 페이지용) | 없음 | 401 → 404 |

`public-events.ts`는 로그인 없이 접근 가능한 공개 페이지 SSR용이라 세션이 없다. 반면 백엔드는 `SecurityConfig`에서 `.anyRequest().authenticated()`로 모든 요청에 인증을 요구하고, `HeaderAuthenticationFilter`에서 `/api/events/**`를 `tickets` 스코프로 매핑한다.

### 영향 범위

- `GET /api/events` - 이벤트 목록 (동일 문제)
- `GET /api/events/{eventId}` - 이벤트 상세 (발생한 문제)

## 3. 해결 방안

`/api/events` 와 `/api/events/**`는 공개 이벤트 정보를 제공하는 엔드포인트다. `EventController`도 인증 컨텍스트를 사용하지 않는다. 따라서 백엔드에서 이 경로들을 인증 불필요(public)로 변경한다.

**변경 파일:**
1. `SecurityConfig.kt` - `permitAll()` 목록에 이벤트 경로 추가
2. `HeaderAuthenticationFilter.kt` - `resolveRequiredScope()`에서 이벤트 경로 제거

## 4. 변경 내용

### SecurityConfig.kt

```kotlin
// Before
auth.requestMatchers(
    "/api/auth/**",
    "/api/health",
    "/swagger-ui/**",
    "/v3/api-docs/**"
).permitAll()

// After
auth.requestMatchers(
    "/api/auth/**",
    "/api/health",
    "/api/events",
    "/api/events/**",
    "/swagger-ui/**",
    "/v3/api-docs/**"
).permitAll()
```

### HeaderAuthenticationFilter.kt

```kotlin
// resolveRequiredScope()에서 아래 두 줄 제거
path == "/api/events" -> "tickets"
path.startsWith("/api/events/") -> "tickets"
```
