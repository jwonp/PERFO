import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { getToken, intlMiddleware } = vi.hoisted(() => ({
  getToken: vi.fn(),
  intlMiddleware: vi.fn(() => NextResponse.next()),
}))

vi.mock('next-intl/middleware', () => ({
  default: () => intlMiddleware,
}))

vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}))

import proxy from '../proxy'

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    intlMiddleware.mockReturnValue(NextResponse.next())
  })

  it('allows unauthenticated users to access email auth routes', async () => {
    getToken.mockResolvedValue(null)

    const response = await proxy(new NextRequest('http://localhost:3000/ko/signup?email=test%40example.com'))

    expect(response.status).toBe(200)
  })

  it('allows authenticated users to access my-tickets regardless of role', async () => {
    getToken.mockResolvedValue({ sub: 'user-1', role: 'USER' })

    const response = await proxy(new NextRequest('http://localhost:3000/ko/my-tickets'))

    expect(response.status).toBe(200)
  })

  it('keeps protected-route redirects for unauthenticated users', async () => {
    getToken.mockResolvedValue(null)

    const response = await proxy(new NextRequest('http://localhost:3000/ko/profile'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/ko/login?callbackUrl=%2Fko%2Fprofile')
  })
})
