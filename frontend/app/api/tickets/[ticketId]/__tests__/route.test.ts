import { afterEach, describe, expect, it, vi } from 'vitest'

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth/auth.config', () => ({
  authOptions: {},
}))

const importRoute = async () => {
  vi.resetModules()
  vi.stubEnv('BACKEND_URL', 'http://backend.test')
  return import('../route')
}

describe('/api/tickets/[ticketId] route', () => {
  afterEach(() => {
    getServerSessionMock.mockReset()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('PATCH는 세션 사용자 id를 헤더에 담아 백엔드 수정 API로 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1' } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 5,
      name: 'Updated Ticket',
      imageKey: 'owner-1/5/cover.png',
    }), { status: 200 })))

    const payload = {
      name: 'Updated Ticket',
      venue: '잠실실내체육관',
      googlePlaceId: 'ChIJUPDATED',
      detailAddress: 'B 게이트',
      validDate: '2026-09-01',
      openAt: '2026-09-01T09:00:00.000Z',
      totalCount: 200,
      allowDuplicate: true,
      maxPerUser: 2,
      status: 'ISSUING',
      imageKey: 'owner-1/5/cover.png',
    }
    const { PATCH } = await importRoute()

    const response = await PATCH(
      new Request('http://localhost/api/tickets/5', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
      { params: Promise.resolve({ ticketId: '5' }) },
    )

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/tickets/5',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-User-Id': 'owner-1',
        },
        body: JSON.stringify(payload),
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 5,
      name: 'Updated Ticket',
      imageKey: 'owner-1/5/cover.png',
    })
  })
})
