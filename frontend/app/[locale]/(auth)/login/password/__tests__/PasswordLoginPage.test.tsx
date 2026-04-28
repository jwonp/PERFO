import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PasswordLoginPage from '../page'

let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const messages: Record<string, string> = {
      'common.back': '뒤로',
      'common.next': '다음',
      'common.password': '비밀번호',
      'common.passwordPlaceholder': '비밀번호 입력',
      'passwordLogin.welcome': `환영합니다, ${values?.email ?? ''}`,
      'passwordLogin.subtitle': '비밀번호를 입력하세요',
      'passwordLogin.forgotPassword': '비밀번호 찾기',
    }
    return messages[key] ?? key
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}))

describe('PasswordLoginPage', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams()
  })

  it('shows the email from the query string', () => {
    searchParams = new URLSearchParams('email=user%40example.com')

    render(<PasswordLoginPage />)

    expect(screen.getByText('환영합니다, user@example.com')).toBeInTheDocument()
  })

  it('falls back to a sample email when no email is provided', () => {
    render(<PasswordLoginPage />)

    expect(screen.getByText('환영합니다, user@example.com')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    render(<PasswordLoginPage />)

    const passwordInput = screen.getByLabelText('비밀번호')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: '비밀번호 표시' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: '비밀번호 숨기기' }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})
