# E2E-First 테스트 전략

PERFO는 핵심 사용자 흐름을 먼저 E2E 테스트로 정의한 뒤 구현합니다. 단위 테스트와 통합 테스트는 E2E가 드러낸 세부 규칙, 예외, 분기 로직을 빠르게 검증하는 보조 계층으로 둡니다.

## 기본 원칙

1. 사용자에게 보이는 핵심 여정은 E2E 테스트를 먼저 작성한다.
2. 하나의 함수, 컴포넌트, 서비스 규칙은 단위 테스트로 검증한다.
3. HTTP 계약, DB 저장, 인증/인가, 트랜잭션은 백엔드 통합 테스트로 검증한다.
4. 외부 OAuth, 결제, 푸시 전송처럼 제3자 상태에 의존하는 부분은 테스트 전용 대역 또는 mock provider를 사용한다.
5. E2E 테스트 데이터는 매 실행마다 reset/seed 가능해야 하며, 개인 로컬 데이터에 의존하지 않는다.

## 개발 루프

```bash
# 1. 실패하는 사용자 여정 작성
cd frontend
pnpm test:e2e

# 2. 필요한 단위/통합 테스트 추가
pnpm test:unit
cd ../backend
./gradlew test

# 3. 최소 구현 후 전체 검증
cd ../frontend
pnpm test:unit
pnpm test:e2e
cd ../backend
./gradlew test
```

## 테스트 분리 기준

| 기준 | 단위 테스트 | E2E 테스트 |
|------|-------------|------------|
| 관점 | 개발자 관점의 작은 규칙 | 사용자 관점의 실제 흐름 |
| 범위 | 함수, 훅, 컴포넌트, 서비스 메서드 | 브라우저, 라우팅, 인증, API 연동 |
| 속도 | 빨라야 함 | 느려도 핵심 흐름이면 허용 |
| 의존성 | mock/stub 적극 사용 | 실제 앱 서버와 가능한 실제 백엔드 사용 |
| 실패 원인 | 로직 단위로 좁게 드러남 | 제품 흐름의 깨짐을 드러냄 |
| 실행 빈도 | 개발 중 자주 실행 | 기능 완료 전, PR 전, CI에서 실행 |

## 단위 테스트로 둔다

- 비밀번호 규칙, 이메일 형식, 날짜/상태 계산처럼 순수 함수로 표현 가능한 규칙
- 버튼 활성화, 입력 오류 메시지, 조건부 렌더링처럼 한 컴포넌트 안에서 끝나는 UI 상태
- API client가 특정 입력을 올바른 payload로 변환하는지
- 백엔드 service의 분기 로직과 repository 호출 여부
- controller의 요청 validation과 응답 status/body shape

파일 규칙:

```text
frontend/components/**/__tests__/*.test.tsx
frontend/lib/**/__tests__/*.test.ts
backend/src/test/kotlin/**/*
```

## E2E 테스트로 둔다

- 랜딩에서 로그인으로 이동한다.
- 비로그인 사용자가 보호 페이지 접근 시 로그인으로 이동한다.
- 회원가입 후 로그인하고 보호 페이지에 접근한다.
- 티켓 발급, 예약, 내 티켓 확인 같은 제품 핵심 흐름이 동작한다.
- locale prefix가 붙은 실제 라우트(`/ko`, `/en`, `/ja`)에서 주요 흐름이 깨지지 않는다.
- 백엔드, 세션, 라우팅, 브라우저 storage가 함께 맞물리는 동작을 검증한다.

파일 규칙:

```text
frontend/e2e/*.spec.ts
frontend/e2e/<domain>.spec.ts
```

## E2E 작성 컨벤션

- 테스트명은 사용자 행동과 기대 결과를 한 문장으로 쓴다.
- `data-testid`보다 role, label, visible text를 우선 사용한다.
- 임의 timeout, sleep, CSS selector 의존을 피한다.
- 테스트는 서로 독립적이어야 하며 실행 순서에 의존하지 않는다.
- 로그인 세션이 필요한 테스트는 테스트 전용 계정 seed 또는 storage state fixture를 사용한다.
- 테스트가 데이터를 생성하면 테스트 전용 prefix를 사용하고 reset/cleanup 경로를 둔다.

## 초기 우선순위

1. 인증 진입점: 랜딩, 로그인, 보호 페이지 redirect
2. 회원가입/로그인 성공 및 실패
3. 프로필 접근과 로그아웃
4. 티켓 발급과 예약 흐름
5. 다국어 라우팅과 접근성 회귀

## 현재 명령어

```bash
cd frontend

# 단위 테스트
pnpm test:unit

# 단위 테스트 watch
pnpm test:watch

# 단위 테스트 coverage
pnpm test:coverage

# E2E 테스트
pnpm test:e2e

# E2E 디버깅 UI
pnpm test:e2e:ui
```

Playwright는 `frontend/playwright.config.ts`에서 `http://127.0.0.1:14138` 기준으로 Next.js 개발 서버를 자동 실행합니다. 이미 같은 주소에 서버가 떠 있으면 로컬에서는 재사용합니다.
