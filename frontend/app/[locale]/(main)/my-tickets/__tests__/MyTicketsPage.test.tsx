import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MyTicketsPage from '../page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/components/notifications/NotificationButton', () => ({
  NotificationButton: () => <div>NotificationButton</div>,
}))

vi.mock('@/components/notifications/use-notification-snapshot-bootstrap', () => ({
  useNotificationSnapshotBootstrap: vi.fn(),
}))

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'myTickets.title': '내가 발급한 티켓',
      'myTickets.scan': '검표',
      'myTickets.edit': '수정',
      'myTickets.issuedCount': '발급 현황',
      'myTickets.statusIssuing': '발급중',
      'myTickets.statusInactive': '비활성화',
      'myTickets.statusExpired': '기간만료',
      'myTickets.statusVerifying': '검표중',
      'myTickets.empty': '발급한 티켓이 없습니다',
      'myTickets.createTitle': '티켓 발급',
      'myTickets.editTitle': '티켓 수정',
      'myTickets.fieldName': '티켓 이름',
      'myTickets.fieldNamePlaceholder': '예) PERFO Summer Festival',
      'myTickets.fieldVenue': '사용 장소',
      'myTickets.fieldVenuePlaceholder': '예) 올림픽공원 체조경기장',
      'myTickets.fieldDetailAddress': '세부 주소',
      'myTickets.fieldDetailAddressPlaceholder': '예) 2층 A게이트 앞',
      'myTickets.placeAutocompleteUnavailable': '자동완성 사용 불가: 장소명을 직접 입력하세요',
      'myTickets.placeAutocompleteSelected': '장소가 자동완성으로 선택되었습니다',
      'myTickets.fieldDate': '유효 날짜',
      'myTickets.fieldTotal': '총 티켓 수',
      'myTickets.fieldAllowDuplicate': '중복 구매 허용',
      'myTickets.fieldMaxPerUser': '1인당 최대 수량',
      'myTickets.cancel': '취소',
      'myTickets.save': '저장',
      'myTickets.create': '발급하기',
    }
    return messages[key] ?? key
  },
}))

describe('MyTicketsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/tickets' && (init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          json: async () => [],
        }
      }

      if (url === '/api/tickets' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        return {
          ok: true,
          json: async () => ({
            id: 999,
            ...body,
            status: 'INACTIVE',
            issuedCount: 0,
            ownerUserId: 'user-1',
          }),
        }
      }

      throw new Error(`unexpected fetch: ${url}`)
    }) as unknown as typeof fetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('백엔드가 빈 목록을 반환하면 초기 목업 대신 빈 상태를 표시한다', async () => {
    render(<MyTicketsPage />)

    await waitFor(() => expect(screen.getByText('발급한 티켓이 없습니다')).toBeInTheDocument())
  })

  it('백엔드에서 받은 발행 티켓 목록으로 초기 목업을 대체한다', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 42,
          name: 'Backend Synced Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'ChIJBACKEND',
          detailAddress: '1층 입구',
          validDate: '2026-09-01',
          status: 'VERIFYING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)

    const ticket = await screen.findByText('Backend Synced Ticket')

    expect(ticket.closest('article')).toHaveTextContent('잠실실내체육관')
  })

  it('티켓 발급 폼에서 장소 입력과 세부 주소 입력을 제공한다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))

    expect(screen.getByLabelText('사용 장소')).toBeInTheDocument()
    expect(screen.getByLabelText('세부 주소')).toBeInTheDocument()
    expect(screen.getByText('자동완성 사용 불가: 장소명을 직접 입력하세요')).toBeInTheDocument()

    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')

    expect(screen.getByLabelText('사용 장소')).toHaveValue('올림픽공원 체조경기장')
  })

  it('티켓 발급 시 사용 장소와 세부 주소를 새 티켓에 저장해 표시한다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))
    await user.type(screen.getByLabelText('티켓 이름'), 'PERFO Test Ticket')
    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')
    await user.type(screen.getByLabelText('세부 주소'), '2층 A게이트 앞')
    await user.type(screen.getByLabelText('유효 날짜'), '2026-08-15')
    await user.type(screen.getByLabelText('총 티켓 수'), '100')
    await user.click(screen.getByRole('button', { name: '발급하기' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/tickets', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'PERFO Test Ticket',
          venue: '올림픽공원 체조경기장',
          googlePlaceId: '',
          detailAddress: '2층 A게이트 앞',
          validDate: '2026-08-15',
          totalCount: 100,
          allowDuplicate: false,
          maxPerUser: 1,
        }),
      })),
    )

    const ticket = screen.getByText('PERFO Test Ticket').closest('article')

    expect(ticket).not.toBeNull()
    expect(within(ticket as HTMLElement).getByText('올림픽공원 체조경기장')).toBeInTheDocument()
    expect(within(ticket as HTMLElement).getByText('2층 A게이트 앞')).toBeInTheDocument()
  })

  it('티켓 발급 API가 실패하면 불완전한 티켓을 추가하지 않는다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/tickets' && (init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          json: async () => [],
        } as Response
      }

      if (url === '/api/tickets' && init?.method === 'POST') {
        return {
          ok: false,
          json: async () => ({ message: 'Ticket creation failed' }),
        } as Response
      }

      throw new Error(`unexpected fetch: ${url}`)
    })

    render(<MyTicketsPage />)
    await waitFor(() => expect(screen.getByText('발급한 티켓이 없습니다')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))
    await user.type(screen.getByLabelText('티켓 이름'), 'Failed Ticket')
    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')
    await user.type(screen.getByLabelText('유효 날짜'), '2026-08-15')
    await user.type(screen.getByLabelText('총 티켓 수'), '100')
    await user.click(screen.getByRole('button', { name: '발급하기' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/tickets', expect.objectContaining({ method: 'POST' })))

    expect(screen.queryByText('Failed Ticket')).not.toBeInTheDocument()
    expect(screen.getByText('발급한 티켓이 없습니다')).toBeInTheDocument()
  })
})
