# PERFO 테스트 가이드

## 테스트 전략 (TDD)

TDD 사이클: **Red → Green → Refactor**

1. **Red**: 실패하는 테스트를 먼저 작성
2. **Green**: 테스트를 통과시키는 최소한의 코드 작성
3. **Refactor**: 코드 정리 (테스트는 계속 통과)

---

## 테스트 계층

```
E2E 테스트 (향후)
    ↑
통합 테스트 (API 레벨 검증)
    ↑
단위 테스트 (함수/컴포넌트 단위)  ← 주로 여기서 시작
```

**단위 테스트 위주로 작성**하고, 핵심 API 흐름은 통합 테스트로 보완합니다.

---

## 문서 목록

| 문서 | 내용 |
|------|------|
| [frontend.md](./frontend.md) | Next.js - Vitest + React Testing Library |
| [backend.md](./backend.md) | Spring Boot - JUnit 5 + Mockito |

---

## 빠른 시작

### Frontend 테스트 실행

```bash
cd frontend

# 전체 테스트 한 번 실행
pnpm test

# 파일 변경 감지 (watch mode) - 개발 중 사용
pnpm test:watch

# 커버리지 리포트 생성
pnpm test:coverage
```

### Backend 테스트 실행

```bash
cd backend

# 전체 테스트 실행
./gradlew test

# 특정 클래스만 실행
./gradlew test --tests "com.perfo.backend.service.AuthServiceTest"

# 특정 메서드만 실행
./gradlew test --tests "com.perfo.backend.service.AuthServiceTest.signUp_success"

# 테스트 결과 HTML 리포트: backend/build/reports/tests/test/index.html
```

---

## 파일 위치 규칙

### Frontend

```
components/
└── auth/
    ├── LogoutButton.tsx          # 실제 코드
    └── __tests__/
        └── LogoutButton.test.tsx # 테스트 코드
lib/
└── __tests__/
    └── someUtil.test.ts
```

### Backend

```
src/
├── main/java/com/perfo/backend/
│   ├── service/AuthService.java
│   └── controller/AuthController.java
└── test/java/com/perfo/backend/
    ├── service/AuthServiceTest.java      # 단위 테스트
    └── controller/AuthControllerTest.java # 슬라이스 테스트
```
