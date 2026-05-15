import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import ReservedQrPage from '../[reservationId]/page'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async (value: string) => `data:image/png;base64,${value}`),
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ reservationId: '1' }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const m: Record<string, string> = {
      'reserved.qrTitle': '티켓 QR 표시',
      'reserved.qrDescription': '검표 담당자에게 아래 QR 토큰을 제시하세요.',
      'reserved.qrLoading': 'QR 토큰을 불러오는 중입니다.',
      'reserved.qrLoadError': 'QR 토큰을 불러오지 못했습니다.',
      'reserved.qrExpiresAt': '만료 시각',
      'reserved.qrRefresh': 'QR 다시 발급',
    }
    return m[key] ?? key
  },
}))

describe('예약 티켓 QR 페이지', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        token: ['qr', 'token', 'test', '42'].join('-'),
        expiresAt: '2026-04-28T12:00:30Z',
      }),
    })) as unknown as typeof fetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('QR 토큰을 로드해 실제 QR 이미지를 표시한다', async () => {
    render(<ReservedQrPage />)
    await waitFor(() => expect(screen.getByText('qr-token-test-42')).toBeInTheDocument())
    expect(screen.getByRole('img', { name: 'Reservation QR code' })).toHaveAttribute(
      'src',
      'data:image/png;base64,qr-token-test-42',
    )
    expect(screen.getByText(/만료 시각/)).toBeInTheDocument()
  })

  it('재발급 버튼 클릭 시 다시 요청한다', async () => {
    const user = userEvent.setup()
    render(<ReservedQrPage />)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'QR 다시 발급' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})
