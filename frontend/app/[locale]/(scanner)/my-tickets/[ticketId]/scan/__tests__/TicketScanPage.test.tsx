import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import TicketScanPage from '../page'

const decodeFromStreamMock = vi.fn()
const getUserMediaMock = vi.fn()

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class BrowserMultiFormatReader {
    decodeFromStream = decodeFromStreamMock
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ ticketId: '10' }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const m: Record<string, string> = {
      'myTickets.scan': '검표',
      'myTickets.scanTitle': '티켓 검표',
      'myTickets.scanDescription': 'QR 토큰을 스캔하거나 입력해 검표하세요.',
      'myTickets.scanPlaceholder': 'QR 토큰 입력',
      'myTickets.scanSubmit': '검표 요청',
      'myTickets.scanSubmitting': '검표 중...',
      'myTickets.scanCameraReady': '카메라가 준비되었습니다. QR을 비춰주세요.',
      'myTickets.scanCameraBlocked': '카메라 권한이 없거나 사용할 수 없습니다. 수동 입력으로 진행해 주세요.',
      'myTickets.scanCameraError': '카메라 스캔 중 오류가 발생했습니다. 수동 입력을 이용해 주세요.',
      'myTickets.scanCameraReadyShort': '스캔 준비',
      'myTickets.scanCameraBlockedShort': '카메라 차단',
      'myTickets.scanCameraErrorShort': '카메라 오류',
      'myTickets.scanStatusIdle': '카메라 연결 중',
      'myTickets.scanInvalid': 'QR 토큰을 입력해 주세요.',
      'myTickets.scanNetworkError': '검표 요청에 실패했습니다.',
      'myTickets.scanSubmittingShort': '처리 중',
      'myTickets.scanTicketNumber': '티켓 번호',
      'myTickets.scanUsedAt': '검표 시각',
      'myTickets.scanRecentResult': '최근 결과',
      'myTickets.scanRecentEmpty': 'QR을 비추면 최근 검표 결과가 여기에 표시됩니다.',
      'myTickets.scanManualShow': '직접 입력',
      'myTickets.scanManualHide': '입력 닫기',
      'myTickets.scanSoundOn': '사운드 켜짐',
      'myTickets.scanSoundOff': '사운드 꺼짐',
      'myTickets.scanResultSuccess': '검표 성공',
      'myTickets.scanResultAlreadyUsed': '이미 사용된 티켓',
      'myTickets.scanResultInvalid': '유효하지 않은 토큰',
    }
    return m[key] ?? key
  },
}))

describe('티켓 검표 스캔 페이지', () => {
  beforeEach(() => {
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    })
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMediaMock },
    })

    decodeFromStreamMock.mockImplementation(async (_stream: unknown, _video: unknown, callback: (result?: { getText: () => string }, error?: unknown) => void) => {
      callback({ getText: () => ['opaque', 'token', 'from', 'camera'].join('-') })
      return { stop: vi.fn() }
    })

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: 'SUCCESS', ticketNumber: 121, usedAt: '2026-04-28T12:00:10Z' }),
    })) as unknown as typeof fetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(globalThis.navigator, 'mediaDevices')
    vi.clearAllMocks()
  })

  it('카메라에서 QR이 인식되면 자동으로 검표 요청을 보낸다', async () => {
    render(<TicketScanPage />)

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/tickets/10/validations', expect.objectContaining({ method: 'POST' })))
    expect((await screen.findAllByText('검표 성공')).length).toBeGreaterThan(0)
  })

  it('수동 입력으로도 검표 요청을 보낸다', async () => {
    const user = userEvent.setup()
    render(<TicketScanPage />)

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    const input = screen.getByPlaceholderText('QR 토큰 입력')
    await user.clear(input)
    await user.type(input, ['qr', 'token', 'test', '42'].join('-'))
    await user.click(screen.getByRole('button', { name: '검표 요청' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/tickets/10/validations', expect.objectContaining({ method: 'POST' })))
    await waitFor(() => expect(input).toHaveValue(''))
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('서버 영문 message 대신 번역된 결과 라벨을 우선 표시한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: 'SUCCESS', message: 'Ticket verified', ticketNumber: 121, usedAt: '2026-04-28T12:00:10Z' }),
    })) as unknown as typeof fetch)

    render(<TicketScanPage />)

    expect((await screen.findAllByText('검표 성공')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Ticket verified')).not.toBeInTheDocument()
  })

  it('수동 입력 실패 후에도 입력값을 비우고 포커스를 유지한다', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: 'ALREADY_USED', message: 'Ticket already used', ticketNumber: 121 }),
    })) as unknown as typeof fetch)

    render(<TicketScanPage />)

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    const input = screen.getByPlaceholderText('QR 토큰 입력')
    await user.type(input, ['qr', 'token', 'used', '42'].join('-'))
    await user.click(screen.getByRole('button', { name: '검표 요청' }))

    expect((await screen.findAllByText('이미 사용된 티켓')).length).toBeGreaterThan(0)
    await waitFor(() => expect(input).toHaveValue(''))
    await waitFor(() => expect(input).toHaveFocus())
  })
})
