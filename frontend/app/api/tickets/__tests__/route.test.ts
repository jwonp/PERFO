import { afterEach, describe, expect, it, vi } from 'vitest'

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}))
const { createInternalProxyAuthHeadersMock } = vi.hoisted(() => ({
  createInternalProxyAuthHeadersMock: vi.fn(),
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth/auth.config', () => ({
  authOptions: {},
}))
vi.mock('@/lib/server/internal-proxy-auth', () => ({
  createInternalProxyAuthHeaders: createInternalProxyAuthHeadersMock,
}))

const importRoute = async () => {
  vi.resetModules()
  vi.stubEnv('BACKEND_URL', 'http://backend.test')
  return import('../route')
}

describe('/api/tickets route', () => {
  afterEach(() => {
    getServerSessionMock.mockReset()
    createInternalProxyAuthHeadersMock.mockReset()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('GET은 세션 사용자 id를 ownerUserId로 백엔드에 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-42', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: 'Bearer ticket-jwt' })
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
      {
        method: 'GET',
        headers: { Authorization: 'Bearer ticket-jwt' },
        cache: 'no-store',
      },
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

  it('POST는 JSON 요청에 세션 사용자 id를 ownerUserId로 추가해 백엔드에 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: 'Bearer ticket-jwt' })
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }))

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ticket-jwt',
        },
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

  it('POST는 multipart 요청을 payload+file과 함께 백엔드에 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: 'Bearer ticket-jwt' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 21,
      name: 'Multipart Ticket',
      ownerUserId: 'owner-1',
      imageKey: 'owner-1/21/cover.png',
    }), { status: 201 })))

    const clientFormData = new FormData()
    clientFormData.set(
      'payload',
      new File([
        JSON.stringify({
          name: 'Multipart Ticket',
          venue: '올림픽공원 체조경기장',
          googlePlaceId: 'ChIJPLACE',
          detailAddress: '2층 A게이트 앞',
          validDate: '2026-08-15',
          totalCount: 100,
          allowDuplicate: false,
          maxPerUser: 1,
        }),
      ], 'payload.json', { type: 'application/json' }),
    )
    clientFormData.set('file', new File(['png'], 'cover.png', { type: 'image/png' }))

    const multipartRequest = {
      headers: {
        get: (key: string) => key.toLowerCase() === 'content-type' ? 'multipart/form-data; boundary=test' : null,
      },
      formData: async () => clientFormData,
    } as unknown as Request

    const { POST } = await importRoute()
    const response = await POST(multipartRequest)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [, backendRequest] = vi.mocked(fetch).mock.calls[0]
    expect(backendRequest).toMatchObject({
      method: 'POST',
      headers: {
        Authorization: 'Bearer ticket-jwt',
      },
    })
    expect(backendRequest?.body).toBeInstanceOf(FormData)
    const backendFormData = backendRequest?.body as FormData
    const payload = backendFormData.get('payload')
    expect(payload).toBeInstanceOf(File)
    await expect((payload as File).text()).resolves.toBe(JSON.stringify({
      name: 'Multipart Ticket',
      venue: '올림픽공원 체조경기장',
      googlePlaceId: 'ChIJPLACE',
      detailAddress: '2층 A게이트 앞',
      validDate: '2026-08-15',
      totalCount: 100,
      allowDuplicate: false,
      maxPerUser: 1,
      ownerUserId: 'owner-1',
    }))
    expect(backendFormData.get('file')).toBeInstanceOf(File)
    expect(response.status).toBe(200)
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

  it('내부 JWT 서명이 없으면 500을 반환한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockImplementation(() => {
      throw new Error('missing config')
    })
    vi.stubGlobal('fetch', vi.fn())

    const { GET } = await importRoute()
    const response = await GET()

    expect(fetch).not.toHaveBeenCalled()
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ message: 'Internal API JWT signing is not configured' })
  })
})
