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

describe('/api/tickets route', () => {
  afterEach(() => {
    getServerSessionMock.mockReset()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('GET은 세션 사용자 id를 ownerUserId로 백엔드에 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-42' } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
      {
        id: 10,
        name: 'Backend Ticket',
        ownerUserId: 'user-42',
      },
    ]), { status: 200 })))

    const { GET } = await importRoute()

    const response = await GET()

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/tickets?ownerUserId=user-42',
      { method: 'GET', cache: 'no-store' },
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      {
        id: 10,
        name: 'Backend Ticket',
        ownerUserId: 'user-42',
      },
    ])
  })

  it('POST는 세션 사용자 id를 ownerUserId로 추가해 백엔드에 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1' } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 20,
      name: 'Created Ticket',
      ownerUserId: 'owner-1',
    }), { status: 201 })))

    const payload = {
      name: 'Created Ticket',
      venue: '올림픽공원 체조경기장',
      googlePlaceId: 'ChIJPLACE',
      detailAddress: '2층 A게이트 앞',
      validDate: '2026-08-15',
      totalCount: 100,
      allowDuplicate: false,
      maxPerUser: 1,
    }
    const { POST } = await importRoute()

    const response = await POST(new Request('http://localhost/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }))

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ownerUserId: 'owner-1' }),
      }),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 20,
      name: 'Created Ticket',
      ownerUserId: 'owner-1',
    })
  })

  it('세션 사용자 id가 없으면 백엔드 호출 없이 401을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue(null)
    vi.stubGlobal('fetch', vi.fn())

    const { GET } = await importRoute()

    const response = await GET()

    expect(fetch).not.toHaveBeenCalled()
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ message: 'Unauthorized' })
  })
})
