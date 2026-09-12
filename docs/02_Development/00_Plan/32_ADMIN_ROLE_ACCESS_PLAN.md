# Admin Role Access Plan

## 문제 요약

어드민 페이지(`/admin`)는 `isAdminRole(user.role)` 체크 후 비통과 시 `/unauthorized`로 리다이렉트.
`UserRole.kt` enum에 `ADMIN`이 없어 어떤 유저도 `role='ADMIN'`을 가질 수 없음.
결과: 어드민 페이지 접근 영구 불가.

## 현재 상태 (Gap Analysis)

| 레이어 | 현재 상태 | 문제 |
|--------|-----------|------|
| **DB** | `role VARCHAR(32) DEFAULT 'USER'` | `'ADMIN'` 값 세팅 수단 없음 |
| **Backend enum** | `UserRole { USER, ORGANIZER }` | `ADMIN` 누락 |
| **JWT** | `role` claim 발급함 | 값이 절대 `'ADMIN'`이 될 수 없음 |
| **Spring Security** | role 기반 route 보호 없음 | 인증만 체크, role 체크 없음 |
| **Frontend guard** | `isAdminRole(user.role)` 체크 정상 | 코드 정상, 단 role 값이 안 옴 |

**프론트엔드 변경 불필요.** `ADMIN_ROLE = "ADMIN"` 상수와 `isAdminRole()` 함수 이미 정상 구현됨.

## 구현 계획

### Phase 1 — Backend enum 추가 (필수)

**파일:** `backend/src/main/kotlin/com/perfo/backend/entity/UserRole.kt`

```kotlin
enum class UserRole {
    USER,
    ORGANIZER,
    ADMIN,
}
```

- DB `role` 컬럼은 `VARCHAR(32)` — schema 변경 불필요
- Flyway migration 없어도 동작하나, 문서화 목적으로 migration 추가 권장

**검증:** 앱 빌드 통과, `UserRole.valueOf("ADMIN")` 호출 시 예외 없음

---

### Phase 2 — DB에 ADMIN 유저 설정 (운영)

`UserRole.ADMIN` 추가 후 특정 유저에게 role 수동 부여:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin@example.com';
```

**주의:** 현재 role 변경 API 없음. 직접 DB 쿼리로만 가능.

**검증:** `SELECT id, email, role FROM users WHERE role = 'ADMIN';`

---

### Phase 3 — Spring Security role 기반 route 보호 (보안 강화, 권장)

현재 Spring Security는 인증(authenticated)만 체크하고 role 체크 안 함.  
JWT에서 role을 추출하지만 `GrantedAuthority`로 변환하지 않아 `hasRole()` 사용 불가.

#### Step 3-1: HeaderAuthenticationFilter에서 role을 GrantedAuthority로 변환

**파일:** `backend/src/main/kotlin/com/perfo/backend/config/HeaderAuthenticationFilter.kt`

JWT 파싱 후 `UsernamePasswordAuthenticationToken` 생성 시 authorities에 role 추가:

```kotlin
val authorities = listOfNotNull(
    authenticatedUser.role?.let { SimpleGrantedAuthority("ROLE_$it") }
)
// UsernamePasswordAuthenticationToken(authenticatedUser, null, authorities)
```

#### Step 3-2: SecurityConfig에 admin route 보호 추가

**파일:** `backend/src/main/kotlin/com/perfo/backend/config/SecurityConfig.kt`

```kotlin
auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
```

현재 어드민 대시보드는 기존 `/api/tickets` 엔드포인트 재사용 중이므로 당장 필수는 아님.  
향후 `/api/admin/**` 엔드포인트 추가 시 필요.

**검증:** `role='USER'` 유저가 `/api/admin/**` 호출 시 403 반환 확인

---

### Phase 4 — Flyway migration 추가 (선택, 문서화)

**파일:** `backend/src/main/resources/db/migration/V20260603_1__add_admin_role.sql`

```sql
-- ADMIN role is now a valid value for users.role column.
-- Assign admin role manually:
-- UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
COMMENT ON COLUMN users.role IS 'Valid values: USER, ORGANIZER, ADMIN';
```

DB schema 변경 없이 변경 이력 기록 목적.

---

## 구현 순서 및 검증

```
1. UserRole.kt에 ADMIN 추가         → verify: 빌드 성공
2. DB에 admin 유저 role 수동 설정   → verify: SELECT로 확인
3. 앱 재시작 후 admin 페이지 접근   → verify: /admin 정상 로드, redirect 없음
4. (선택) HeaderAuthenticationFilter role→GrantedAuthority 변환
5. (선택) SecurityConfig admin route 보호
```

## 파일 변경 목록

| 파일 | 변경 내용 | 필수 여부 |
|------|-----------|-----------|
| `backend/.../entity/UserRole.kt` | `ADMIN` 추가 | **필수** |
| `backend/.../config/HeaderAuthenticationFilter.kt` | role → GrantedAuthority 변환 | 권장 |
| `backend/.../config/SecurityConfig.kt` | `/api/admin/**` hasRole("ADMIN") | 권장 |
| `backend/.../db/migration/V20260603_1__add_admin_role.sql` | 변경 이력 migration | 선택 |

프론트엔드 변경 없음.

## 리스크

- **Phase 3 구현 없이 운영 시:** 백엔드 role 검증 없이 프론트엔드 guard만 존재. JWT 조작으로 어드민 API 우회 가능성 있음 (현재 어드민 전용 백엔드 API가 없으므로 당장 위험도는 낮음).
- **ADMIN 유저 세팅 수단:** 현재 API 없음, DB 직접 수정만 가능. 운영 환경에서는 별도 관리 스크립트 또는 보호된 API 고려.
