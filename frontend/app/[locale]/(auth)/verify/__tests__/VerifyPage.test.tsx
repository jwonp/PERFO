import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VerifyPage from '../page'

const push = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) => {
    const messages: Record<string, string> = {
      'verify.title': `${values?.email ?? ''}으로 6자리 인증 코드를 전송했습니다`,
      'verify.subtitle': '이메일을 확인하고 아래에 코드를 입력하세요',
      'verify.verify': '인증',
      'verify.resend': '코드 재전송',
      'verify.verifying': '인증 중...',
      'verify.requestFailed': '인증 코드를 요청하지 못했습니다.',
      'verify.failed': '인증 코드 확인에 실패했습니다.',
      'verify.missingEmail': '이메일 정보가 없습니다. 회원가입을 다시 시작해 주세요.',
      'verify.missingDraft': '회원가입 정보가 만료되었습니다. 다시 입력해 주세요.',
      'verify.codeIncomplete': '6자리 인증 코드를 모두 입력해 주세요.',
      'verify.previewCode': `테스트용 인증 코드: ${values?.code ?? ''}`,
      'verify.signupFailed': '회원가입을 완료하지 못했습니다.',
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
  signIn: vi.fn(async () => ({ ok: true })),
}))

describe('VerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParams = new URLSearchParams('email=new%40example.com&mode=signup')
    window.sessionStorage.clear()
    window.sessionStorage.setItem(
      'perfo.signup-draft',
      JSON.stringify({
        email: 'new@example.com',
        name: '홍길동',
        password: 'Valid123!',
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ previewCode: '123456' }), { status: 200 })),
    )
  })

  it('이메일이 없으면 인증 코드 요청 없이 오류를 표시한다', async () => {
    searchParams = new URLSearchParams('mode=signup')
    const fetchMock = vi.mocked(fetch)

    render(<VerifyPage />)

    expect(await screen.findByText('이메일 정보가 없습니다. 회원가입을 다시 시작해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('회원가입 초안이 없으면 인증 코드 요청 없이 오류를 표시한다', async () => {
    window.sessionStorage.clear()
    const fetchMock = vi.mocked(fetch)

    render(<VerifyPage />)

    expect(await screen.findByText('회원가입 정보가 만료되었습니다. 다시 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('6자리 코드를 붙여넣으면 입력 칸이 채워지고 인증 버튼이 활성화된다', async () => {
    render(<VerifyPage />)

    await screen.findByText('테스트용 인증 코드: 123456')

    const firstInput = screen.getByLabelText('verification-code-1')
    fireEvent.paste(firstInput, {
      clipboardData: {
        getData: () => '12a3456',
      },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('verification-code-1')).toHaveValue('1')
      expect(screen.getByLabelText('verification-code-2')).toHaveValue('2')
      expect(screen.getByLabelText('verification-code-3')).toHaveValue('3')
      expect(screen.getByLabelText('verification-code-4')).toHaveValue('4')
      expect(screen.getByLabelText('verification-code-5')).toHaveValue('5')
      expect(screen.getByLabelText('verification-code-6')).toHaveValue('6')
    })

    expect(screen.getByRole('button', { name: '인증' })).toBeEnabled()
  })

  it('6자리를 모두 입력하기 전에는 인증 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<VerifyPage />)

    await screen.findByText('테스트용 인증 코드: 123456')
    await user.type(screen.getByLabelText('verification-code-1'), '1')
    await user.type(screen.getByLabelText('verification-code-2'), '2')

    expect(screen.getByRole('button', { name: '인증' })).toBeDisabled()
  })
})
