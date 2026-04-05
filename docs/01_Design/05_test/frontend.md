# Frontend 테스트 가이드 (Vitest + React Testing Library)

## 설치된 도구

| 도구 | 역할 |
|------|------|
| `vitest` | 테스트 러너 (Jest 호환) |
| `@testing-library/react` | React 컴포넌트 렌더링/쿼리 |
| `@testing-library/user-event` | 사용자 이벤트 시뮬레이션 |
| `@testing-library/jest-dom` | DOM 커스텀 매처 (`toBeInTheDocument` 등) |
| `jsdom` | 브라우저 환경 시뮬레이션 |

---

## 핵심 개념

### 쿼리 우선순위

Testing Library의 철학: **사용자가 실제로 보는 방식**으로 요소를 찾는다.

```
1순위: getByRole     - 접근성 역할 기반 (권장)
2순위: getByLabelText - label과 연결된 input
3순위: getByText     - 텍스트 내용
4순위: getByPlaceholderText
5순위: getByTestId   - data-testid (최후 수단)
```

### getBy vs queryBy vs findBy

```typescript
getByRole('button')     // 없으면 즉시 에러
queryByRole('button')   // 없으면 null 반환 (존재 여부 검사 시)
findByRole('button')    // 비동기 대기 후 반환 (await 필요)
```

---

## 기본 패턴

### 컴포넌트 렌더링 테스트

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('제목이 표시된다', () => {
    render(<MyComponent title="안녕하세요" />)
    expect(screen.getByText('안녕하세요')).toBeInTheDocument()
  })
})
```

### 사용자 이벤트 테스트

```typescript
import userEvent from '@testing-library/user-event'

it('버튼 클릭 시 카운트가 증가한다', async () => {
  const user = userEvent.setup()  // 항상 setup() 사용
  render(<Counter />)

  await user.click(screen.getByRole('button', { name: '증가' }))

  expect(screen.getByText('1')).toBeInTheDocument()
})
```

### 폼 입력 테스트

```typescript
it('이메일 입력 후 제출하면 onSubmit이 호출된다', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()
  render(<EmailForm onSubmit={handleSubmit} />)

  await user.type(screen.getByLabelText('이메일'), 'test@example.com')
  await user.click(screen.getByRole('button', { name: '다음' }))

  expect(handleSubmit).toHaveBeenCalledWith('test@example.com')
})
```

---

## Mock 패턴

### 외부 모듈 mock

```typescript
// next-auth mock
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

// next-intl mock (번역 키를 그대로 반환)
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
```

### API fetch mock

```typescript
it('API 호출 성공 시 사용자 목록을 표시한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([{ id: 1, name: '테스터' }]),
  }))

  render(<UserList />)

  expect(await screen.findByText('테스터')).toBeInTheDocument()
})
```

### 함수 mock

```typescript
const mockFn = vi.fn()               // 기본 mock 함수
const mockFn = vi.fn(() => 'value')  // 반환값 지정
const mockFn = vi.fn().mockResolvedValue(data)  // Promise 반환

// 호출 검증
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(1)
```

---

## 유용한 매처

```typescript
// DOM 존재 여부
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// 텍스트 내용
expect(element).toHaveTextContent('안녕하세요')

// CSS 클래스
expect(element).toHaveClass('active')

// 비활성화 상태
expect(button).toBeDisabled()
expect(input).toBeEnabled()

// 값
expect(input).toHaveValue('입력값')
```

---

## PERFO 테스트 예시

### 비밀번호 유효성 검사 컴포넌트 (TDD 작성 예시)

아직 구현 전 → 테스트 먼저 작성:

```typescript
// components/auth/__tests__/PasswordValidator.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import PasswordValidator from '../PasswordValidator'

describe('PasswordValidator', () => {
  it('8자 미만이면 "8자 이상" 조건이 실패 상태다', async () => {
    const user = userEvent.setup()
    render(<PasswordValidator />)

    await user.type(screen.getByLabelText('비밀번호'), 'short')

    expect(screen.getByText('8자 이상')).toHaveClass('text-red-500')
  })

  it('8자 이상 영문+숫자+특수문자 포함 시 모든 조건이 통과된다', async () => {
    const user = userEvent.setup()
    render(<PasswordValidator />)

    await user.type(screen.getByLabelText('비밀번호'), 'Valid123!')

    expect(screen.getByText('8자 이상')).toHaveClass('text-green-500')
    expect(screen.getByText('영문 포함')).toHaveClass('text-green-500')
    expect(screen.getByText('숫자 포함')).toHaveClass('text-green-500')
    expect(screen.getByText('특수 문자 포함')).toHaveClass('text-green-500')
  })
})
```

### 순수 함수 유틸 테스트

```typescript
// lib/__tests__/validators.test.ts
import { describe, it, expect } from 'vitest'
import { isValidPassword, isValidEmail } from '../validators'

describe('isValidPassword', () => {
  it('8자 이상, 영문, 숫자, 특수문자 포함 시 true', () => {
    expect(isValidPassword('Valid123!')).toBe(true)
  })

  it('8자 미만이면 false', () => {
    expect(isValidPassword('Abc1!')).toBe(false)
  })

  it('특수문자 없으면 false', () => {
    expect(isValidPassword('ValidPass1')).toBe(false)
  })
})
```

---

## 실행 명령어

```bash
# 개발 중 (저장 시 자동 재실행)
pnpm test:watch

# CI / 커밋 전 전체 실행
pnpm test

# 커버리지 확인
pnpm test:coverage
# → coverage/index.html 열어서 확인
```
