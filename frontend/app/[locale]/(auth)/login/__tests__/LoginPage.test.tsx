import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../page'
import { signIn } from 'next-auth/react'

const push = vi.fn()

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'login.welcome': '환영합니다, 로그인 해주세요',
      'login.subtitle': '이메일을 입력하여 계속하세요',
      'login.google': 'Google',
      'login.naver': 'Naver',
      'login.line': 'LINE',
      'common.email': '이메일 주소',
      'common.emailPlaceholder': 'name@example.com',
      'common.next': '다음',
      'common.or': '또는',
    }
    return messages[key] ?? key
  },
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
  Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email login entry controls', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'PERFO' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '이메일 주소' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /naver/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /line/i })).toBeInTheDocument()
  })

  it('passes the typed email to the password step', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: '이메일 주소' }), ' user@example.com ')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(push).toHaveBeenCalledWith('/login/password?email=user%40example.com')
  })

  it('starts the requested social login provider', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /naver/i }))

    expect(signIn).toHaveBeenCalledWith('naver', { callbackUrl: '/' })
  })
})
