import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignUpPage from '../page'

const push = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const messages: Record<string, string> = {
      'common.email': '이메일 주소',
      'common.password': '비밀번호',
      'common.confirmPassword': '비밀번호 확인',
      'common.createPasswordPlaceholder': '비밀번호를 생성하세요',
      'common.confirmPasswordPlaceholder': '비밀번호를 다시 입력하세요',
      'common.displayName': '이름',
      'common.displayNamePlaceholder': '이름을 입력하세요',
      'common.termsLink': '이용약관',
      'common.privacyLink': '개인정보 처리방침',
      'signup.title': `${values?.email ?? 'user@example.com'}로 회원가입`,
      'signup.subtitle': '계정의 안전한 비밀번호를 생성하세요',
      'signup.signUp': '가입하기',
      'signup.termsAgreement': '이용약관에 동의합니다',
      'signup.privacyAgreement': '개인정보 처리방침에 동의합니다',
      'signup.marketingAgreement': '마케팅 수신에 동의합니다',
      'passwordRules.minLength': '8자 이상',
      'passwordRules.uppercase': '대문자 포함',
      'passwordRules.lowercase': '소문자 포함',
      'passwordRules.number': '숫자 포함',
      'passwordRules.special': '특수 문자 포함',
      'passwordRules.match': '비밀번호 일치',
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

describe('SignUpPage', () => {
  beforeEach(() => {
    push.mockClear()
    searchParams = new URLSearchParams('email=new%40example.com')
  })

  it('비밀번호가 8자 미만이면 8자 이상 조건이 실패 상태다', async () => {
    const user = userEvent.setup()
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('비밀번호'), 'Aa1!')

    expect(screen.getByLabelText('8자 이상: 미충족')).toBeInTheDocument()
  })

  it('모든 비밀번호 조건과 이름, 필수 약관이 충족되어야 회원가입 버튼이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<SignUpPage />)

    const signUpButton = screen.getByRole('button', { name: '가입하기' })
    expect(signUpButton).toBeDisabled()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('비밀번호'), 'Valid123!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Valid123!')
    await user.click(screen.getByRole('checkbox', { name: '이용약관에 동의합니다' }))

    expect(signUpButton).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: '개인정보 처리방침에 동의합니다' }))

    expect(signUpButton).toBeEnabled()
  })

  it('마케팅 수신 동의는 선택값이며 미동의 상태에서도 가입 버튼이 활성화된다', async () => {
    const user = userEvent.setup()
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('비밀번호'), 'Valid123!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Valid123!')
    await user.click(screen.getByRole('checkbox', { name: '이용약관에 동의합니다' }))
    await user.click(screen.getByRole('checkbox', { name: '개인정보 처리방침에 동의합니다' }))

    expect(screen.getByRole('checkbox', { name: '마케팅 수신에 동의합니다' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('회원가입 제출 전 이메일 인증이 필요하면 인증 화면으로 이동한다', async () => {
    const user = userEvent.setup()
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('비밀번호'), 'Valid123!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Valid123!')
    await user.click(screen.getByRole('checkbox', { name: '이용약관에 동의합니다' }))
    await user.click(screen.getByRole('checkbox', { name: '개인정보 처리방침에 동의합니다' }))
    await user.click(screen.getByRole('button', { name: '가입하기' }))

    expect(push).toHaveBeenCalledWith('/verify?email=new%40example.com')
  })
})
