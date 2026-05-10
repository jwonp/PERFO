import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../page'
import { signIn } from 'next-auth/react'

const push = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'login.welcome': 'PERFO에 로그인하세요',
      'login.subtitle': '이메일 또는 소셜 계정으로 계속할 수 있습니다.',
      'login.google': 'Google로 계속하기',
      'login.naver': '네이버로 계속하기',
      'login.line': 'LINE으로 계속하기',
      'login.emailRequired': '이메일 주소를 입력해 주세요.',
      'login.checkingEmail': '이메일 확인 중...',
      'login.lookupFailed': '이메일 상태를 확인하지 못했습니다.',
      'login.socialAccountHint': '이 이메일은 social 소셜 로그인으로 가입되어 있습니다.',
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
    searchParams = new URLSearchParams()
  })

  it('renders email and social login entry controls', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: 'PERFO' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '이메일 주소' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '네이버로 계속하기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'LINE으로 계속하기' })).toBeInTheDocument()
  })

  it('routes unknown email to sign-up', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ exists: false }), { status: 200 })))

    render(<LoginPage />)

    await user.type(screen.getByRole('textbox', { name: '이메일 주소' }), 'new@example.com')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(push).toHaveBeenCalledWith('/signup?email=new%40example.com')
  })

  it('starts the requested social login provider', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: '네이버로 계속하기' }))

    expect(signIn).toHaveBeenCalledWith('naver', { callbackUrl: '/reserved' })
  })
})
