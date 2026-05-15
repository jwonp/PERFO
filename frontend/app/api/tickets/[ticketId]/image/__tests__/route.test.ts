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

describe('/api/tickets/[ticketId]/image route', () => {
  afterEach(() => {
    getServerSessionMock.mockReset()
    createInternalProxyAuthHeadersMock.mockReset()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('POST는 세션 사용자 id 헤더와 함께 multipart 업로드를 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: 'Bearer ticket-jwt' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      imageKey: 'owner-1/5/generated.png',
      imageUrl: '/api/tickets/5/image',
    }), { status: 200 })))

    const formData = new FormData()
    formData.set('file', new File(['png'], 'cover.png', { type: 'image/png' }))
    const { POST } = await importRoute()

    const response = await POST(
      new Request('http://localhost/api/tickets/5/image', {
        method: 'POST',
        body: formData,
      }),
      { params: Promise.resolve({ ticketId: '5' }) },
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://backend.test/api/tickets/5/image')
    expect(init).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer ticket-jwt' },
    })
    expect(typeof (init?.body as FormData).get).toBe('function')
    expect((init?.body as FormData).get('file')).toBeTruthy()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      imageKey: 'owner-1/5/generated.png',
      imageUrl: '/api/tickets/5/image',
    })
  })

  it('DELETE는 imageKey query와 함께 cleanup 요청을 전달한다', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'owner-1', role: 'USER' } })
    createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: 'Bearer ticket-jwt' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))

    const { DELETE } = await importRoute()

    const response = await DELETE(
      new Request('http://localhost/api/tickets/5/image?imageKey=owner-1%2F5%2Ftmp.png', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ ticketId: '5' }) },
    )

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/api/tickets/5/image?imageKey=owner-1%2F5%2Ftmp.png',
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ticket-jwt' },
      },
    )
    expect(response.status).toBe(204)
  })
})
