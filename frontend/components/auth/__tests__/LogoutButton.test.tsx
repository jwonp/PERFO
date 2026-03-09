import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LogoutButton from '../LogoutButton'

// next-auth/react mock
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

// next-intl mock - useTranslations가 항상 key를 그대로 반환
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { signOut } from 'next-auth/react'

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('로그아웃 버튼이 렌더링된다', () => {
    render(<LogoutButton />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('클릭하면 signOut이 /login으로 리다이렉트하며 호출된다', async () => {
    const user = userEvent.setup()
    render(<LogoutButton />)

    await user.click(screen.getByRole('button'))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('className prop이 버튼에 적용된다', () => {
    render(<LogoutButton className="custom-class" />)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
