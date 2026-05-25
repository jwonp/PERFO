import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import ReservedQrPage from '../[reservationId]/page'

const push = vi.fn()
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async (value: string) => `data:image/png;base64,${value}`),
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ reservationId: '1' }),
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
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
      'reserved.qrBackToList': '예약 목록으로 돌아가기',
      'reserved.qrStatusAlreadyUsedTitle': '이미 사용된 티켓입니다',
      'reserved.qrStatusAlreadyUsedDescription': '사용 완료된 티켓은 QR을 다시 발급할 수 없습니다.',
      'reserved.qrStatusNotOpenTitle': '아직 검표 시간이 아닙니다',
      'reserved.qrStatusNotOpenDescription': '검표 가능 시간이 되면 다시 시도해 주세요.',
      'reserved.qrStatusExpiredTitle': '유효 기간이 지난 티켓입니다',
      'reserved.qrStatusExpiredDescription': '만료된 티켓은 QR을 다시 발급할 수 없습니다.',
    }
    return m[key] ?? key
  },
}))

describe('예약 티켓 QR 페이지', () => {
  beforeEach(() => {
    push.mockReset()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        token: ['qr', 'token', 'test', '42'].join('-'),
        expiresAt: '2026-06-10T12:00:30Z',
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

  it('이미 사용된 티켓이면 QR 대신 terminal 상태 카드를 표시하고 재발급을 중단한다', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        code: 'ALREADY_USED',
        message: '이미 사용된 티켓입니다',
      }),
    })) as unknown as typeof fetch)

    render(<ReservedQrPage />)

    expect(await screen.findByText('이미 사용된 티켓입니다')).toBeInTheDocument()
    expect(screen.getByText('사용 완료된 티켓은 QR을 다시 발급할 수 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Reservation QR code' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'QR 다시 발급' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '예약 목록으로 돌아가기' }))
    expect(push).toHaveBeenCalledWith('/reserved')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('만료 시각이 매우 멀어도 timeout overflow 없이 최대 지연으로 나눠 예약한다', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        token: ['qr', 'token', 'future', '42'].join('-'),
        expiresAt: '2099-06-10T12:00:30Z',
      }),
    })) as unknown as typeof fetch)

    render(<ReservedQrPage />)

    await waitFor(() => expect(screen.getByText('qr-token-future-42')).toBeInTheDocument())
    await waitFor(() =>
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), MAX_TIMEOUT_DELAY_MS),
    )
  })
})
