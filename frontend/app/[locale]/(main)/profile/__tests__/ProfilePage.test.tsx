import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from '../page'
import { signOut } from 'next-auth/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: '유저 정보',
      appSettings: 'APP SETTINGS',
      darkMode: '다크 모드 설정',
      pushNotification: '푸시 알림 설정',
      support: 'SUPPORT',
      customerSupport: '고객 문의',
      privacyPolicy: 'Privacy Policy',
      logout: '로그아웃',
    }
    return messages[key] ?? key
  },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: '홍길동',
        email: 'hong@example.com',
        image: null,
      },
    },
  }),
  signOut: vi.fn(),
}))

vi.mock('@/components/push/PushNotification', () => ({
  PushNotification: () => <div>PushNotification</div>,
}))

describe('ProfilePage logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the current user and a logout action', () => {
    render(<ProfilePage />)

    expect(screen.getByRole('heading', { name: '유저 정보' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '홍길동' })).toBeInTheDocument()
    expect(screen.getByText('ID: hong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument()
  })

  it('logs out to the login page', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
