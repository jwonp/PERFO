import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MyTicketsPage from '../page'

vi.mock('next/dynamic', async () => {
  const { default: React } = await import('react')
  return {
    default: (fn: () => Promise<{ default: React.ComponentType }>) => {
      const LazyComp = React.lazy(fn)
      return function Dynamic(props: Record<string, unknown>) {
        return React.createElement(React.Suspense, { fallback: null }, React.createElement(LazyComp, props))
      }
    },
  }
})

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
      'myTickets.filterAll': '전체',
      'myTickets.filterAllowDuplicate': '중복 허용',
      'myTickets.filterNoDuplicate': '중복 미허용',
      'myTickets.emptyAllowDuplicate': '중복 구매를 허용한 티켓이 없습니다',
      'myTickets.emptyNoDuplicate': '중복 구매를 제한한 티켓이 없습니다',
      'myTickets.createTitle': '티켓 발급',
      'myTickets.editTitle': '티켓 수정',
      'myTickets.fieldName': '티켓 이름',
      'myTickets.fieldNamePlaceholder': '예) PERFO Summer Festival',
      'myTickets.fieldVenue': '사용 장소',
      'myTickets.fieldVenuePlaceholder': '예) 올림픽공원 체조경기장',
      'myTickets.fieldDetailAddress': '세부 주소',
      'myTickets.fieldDetailAddressPlaceholder': '예) 2층 A게이트 앞',
      'myTickets.placeAutocompleteLoading': '장소 자동완성을 불러오는 중입니다',
      'myTickets.placeAutocompleteReady': '자동완성으로 장소를 검색할 수 있습니다',
      'myTickets.placeAutocompleteUnavailable': '자동완성 사용 불가: 장소명을 직접 입력하세요',
      'myTickets.placeAutocompleteError': '자동완성을 불러오지 못했습니다. 장소명을 직접 입력하세요',
      'myTickets.placeAutocompleteSelected': '장소가 자동완성으로 선택되었습니다',
      'myTickets.placeAutocompleteEmpty': '검색 결과가 없습니다. 장소명을 직접 입력하세요',
      'myTickets.fieldDate': '유효 날짜',
      'myTickets.fieldDateHint': '이 날짜가 지나면 티켓 상태가 자동으로 기간만료로 바뀝니다.',
      'myTickets.fieldOpenAt': '검표 오픈 시각',
      'myTickets.fieldOpenAtHint': '이 시각이 되면 발급중 티켓이 자동으로 검표중으로 전환됩니다.',
      'myTickets.fieldStatus': '운영 상태',
      'myTickets.fieldTotal': '총 티켓 수',
      'myTickets.fieldAllowDuplicate': '중복 구매 허용',
      'myTickets.fieldMaxPerUser': '1인당 최대 수량',
      'myTickets.fieldImage': '대표 이미지',
      'myTickets.fieldImageHint': 'PNG, JPG, WEBP만 업로드할 수 있습니다.',
      'myTickets.discoveryModeListed': '목록에 노출',
      'myTickets.discoveryModeLinkOnly': '링크로만 공유',
      'myTickets.discoveryModeHint': '목록 노출 여부만 제어합니다. 두 경우 모두 상세 접근과 예매는 가능합니다.',
      'myTickets.publicBookingTitle': '공개 예매 URL',
      'myTickets.publicBookingUnavailable': '공개 예매 URL을 아직 만들 수 없습니다.',
      'myTickets.copyBookingUrl': '복사',
      'myTickets.shareBookingUrl': '공유',
      'myTickets.copySuccess': '예매 URL을 복사했습니다.',
      'myTickets.linkOnlyBadge': '링크 전용',
      'myTickets.verifyingFutureOpenAtWarning': '오픈 시각이 아직 미래면 VERIFYING 상태로 저장할 수 없습니다.',
      'myTickets.cancel': '취소',
      'myTickets.save': '저장',
      'myTickets.create': '발급하기',
      'myTickets.saving': '저장 중...',
      'myTickets.saveFailed': '티켓 저장에 실패했습니다.',
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
            imageUrl: null,
            discoveryMode: body.discoveryMode ?? 'LISTED',
            eventId: 999,
            publicBookingPath: '/events/999',
          }),
        }
      }

      if (url === '/api/tickets/42/image' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            imageKey: 'owner-1/42/new.png',
            imageUrl: '/api/tickets/42/image',
          }),
        }
      }

      if (url === '/api/tickets/42' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body))
        return {
          ok: true,
          json: async () => ({
            id: 42,
            ...body,
            imageUrl: body.imageKey ? '/api/tickets/42/image' : null,
            issuedCount: 25,
            ownerUserId: 'user-1',
            discoveryMode: body.discoveryMode ?? 'LISTED',
            eventId: 42,
            publicBookingPath: '/events/42',
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
          openAt: '2026-09-01T09:00:00Z',
          imageUrl: '/api/tickets/42/image',
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

  it('티켓 발급 폼에서 오픈 시각과 이미지 입력을 제공한다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))

    await waitFor(() => expect(screen.getByLabelText('사용 장소')).toBeInTheDocument())
    expect(screen.getByLabelText('세부 주소')).toBeInTheDocument()
    expect(screen.getByLabelText('검표 오픈 시각')).toBeInTheDocument()
    expect(screen.getByLabelText('대표 이미지')).toBeInTheDocument()
    expect(screen.getByText('자동완성 사용 불가: 장소명을 직접 입력하세요')).toBeInTheDocument()
    expect(screen.getByText('이 날짜가 지나면 티켓 상태가 자동으로 기간만료로 바뀝니다.')).toBeInTheDocument()
    expect(screen.getByText('이 시각이 되면 발급중 티켓이 자동으로 검표중으로 전환됩니다.')).toBeInTheDocument()
  })

  it('티켓 발급 시 openAt을 포함한 payload를 서버에 저장한다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))
    await user.type(screen.getByLabelText('티켓 이름'), 'PERFO Test Ticket')
    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')
    await user.type(screen.getByLabelText('세부 주소'), '2층 A게이트 앞')
    await user.type(screen.getByLabelText('유효 날짜'), '2026-08-15')
    await user.type(screen.getByLabelText('총 티켓 수'), '100')
    await user.type(screen.getByLabelText('검표 오픈 시각'), '2026-08-15T17:00')
    await user.click(screen.getByRole('button', { name: '발급하기' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    const [, createRequest] = vi.mocked(fetch).mock.calls[1]
    expect(createRequest).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    expect(JSON.parse(String(createRequest?.body))).toMatchObject({
      name: 'PERFO Test Ticket',
      venue: '올림픽공원 체조경기장',
      googlePlaceId: '',
      detailAddress: '2층 A게이트 앞',
      validDate: '2026-08-15',
      openAt: expect.any(String),
      totalCount: 100,
      allowDuplicate: false,
      maxPerUser: 1,
      discoveryMode: 'LISTED',
    })

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

  it('discoveryMode 토글 값이 생성 payload와 카드 배지에 반영된다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))
    await user.click(screen.getByRole('switch', { name: '목록에 노출' }))
    await user.type(screen.getByLabelText('티켓 이름'), 'Link Only Ticket')
    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')
    await user.type(screen.getByLabelText('유효 날짜'), '2026-08-15')
    await user.type(screen.getByLabelText('총 티켓 수'), '100')
    await user.click(screen.getByRole('button', { name: '발급하기' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/tickets', expect.objectContaining({ method: 'POST' })))

    const [, createRequest] = vi.mocked(fetch).mock.calls[1]
    expect(JSON.parse(String(createRequest?.body))).toMatchObject({
      discoveryMode: 'LINK_ONLY',
    })
    expect(screen.getByText('링크 전용')).toBeInTheDocument()
  })

  it('저장 후 공개 예매 URL 복사 버튼이 동작한다', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))
    await user.type(screen.getByLabelText('티켓 이름'), 'Copyable Ticket')
    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')
    await user.type(screen.getByLabelText('유효 날짜'), '2026-08-15')
    await user.type(screen.getByLabelText('총 티켓 수'), '100')
    await user.click(screen.getByRole('button', { name: '발급하기' }))

    const copyButton = await screen.findByRole('button', { name: '복사' })
    await user.click(copyButton)

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/ko\/events\/999$/))
    expect(screen.getByText('예매 URL을 복사했습니다.')).toBeInTheDocument()
  })

  it('수정 저장은 PATCH API를 호출하고 서버 응답으로 목록을 갱신한다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 42,
          name: 'Editable Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'ChIJBACKEND',
          detailAddress: '1층 입구',
          validDate: '2026-09-01',
          openAt: '2026-09-01T09:00:00Z',
          imageKey: 'owner-1/42/original.png',
          imageUrl: '/api/tickets/42/image',
          status: 'ISSUING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)

    await screen.findByText('Editable Ticket')
    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.clear(screen.getByLabelText('티켓 이름'))
    await user.type(screen.getByLabelText('티켓 이름'), 'Edited Ticket')
    await user.selectOptions(screen.getByLabelText('운영 상태'), 'VERIFYING')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/tickets/42', expect.objectContaining({
        method: 'PATCH',
      })),
    )

    expect((await screen.findAllByText('Edited Ticket')).length).toBeGreaterThan(0)
  })

  it('VERIFYING 선택 시 openAt이 미래면 경고를 표시한다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 42,
          name: 'Warning Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'ChIJBACKEND',
          detailAddress: '1층 입구',
          validDate: '2026-09-01',
          openAt: '2099-09-01T09:00:00Z',
          status: 'ISSUING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)

    await screen.findByText('Warning Ticket')
    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.selectOptions(screen.getByLabelText('운영 상태'), 'VERIFYING')

    expect(screen.getByText('오픈 시각이 아직 미래면 VERIFYING 상태로 저장할 수 없습니다.')).toBeInTheDocument()
  })

  it('전체 필터에서는 전체 티켓 목록을 보여준다', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: 'Duplicate Allowed Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'place-1',
          detailAddress: '1층',
          validDate: '2026-09-01',
          openAt: '2026-09-01T10:00:00Z',
          status: 'VERIFYING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
        {
          id: 2,
          name: 'No Duplicate Ticket',
          venue: 'KSPO DOME',
          googlePlaceId: 'place-2',
          detailAddress: '2층',
          validDate: '2026-09-02',
          openAt: '2026-09-02T10:00:00Z',
          status: 'ISSUING',
          issuedCount: 10,
          totalCount: 50,
          allowDuplicate: false,
          maxPerUser: 1,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)

    await waitFor(() => {
      expect(screen.getByText('Duplicate Allowed Ticket')).toBeInTheDocument()
      expect(screen.getByText('No Duplicate Ticket')).toBeInTheDocument()
    })
  })

  it('중복 허용 필터를 선택하면 allowDuplicate=true 티켓만 남긴다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: 'Duplicate Allowed Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'place-1',
          detailAddress: '1층',
          validDate: '2026-09-01',
          openAt: '2026-09-01T10:00:00Z',
          status: 'VERIFYING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
        {
          id: 2,
          name: 'No Duplicate Ticket',
          venue: 'KSPO DOME',
          googlePlaceId: 'place-2',
          detailAddress: '2층',
          validDate: '2026-09-02',
          openAt: '2026-09-02T10:00:00Z',
          status: 'ISSUING',
          issuedCount: 10,
          totalCount: 50,
          allowDuplicate: false,
          maxPerUser: 1,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)
    await screen.findByText('Duplicate Allowed Ticket')

    await user.click(screen.getByRole('button', { name: '중복 허용' }))

    await waitFor(() => {
      expect(screen.getByText('Duplicate Allowed Ticket')).toBeInTheDocument()
      expect(screen.queryByText('No Duplicate Ticket')).not.toBeInTheDocument()
    })
  })

  it('중복 미허용 필터를 선택하면 allowDuplicate=false 티켓만 남긴다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: 'Duplicate Allowed Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'place-1',
          detailAddress: '1층',
          validDate: '2026-09-01',
          openAt: '2026-09-01T10:00:00Z',
          status: 'VERIFYING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
        {
          id: 2,
          name: 'No Duplicate Ticket',
          venue: 'KSPO DOME',
          googlePlaceId: 'place-2',
          detailAddress: '2층',
          validDate: '2026-09-02',
          openAt: '2026-09-02T10:00:00Z',
          status: 'ISSUING',
          issuedCount: 10,
          totalCount: 50,
          allowDuplicate: false,
          maxPerUser: 1,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)
    await screen.findByText('Duplicate Allowed Ticket')

    await user.click(screen.getByRole('button', { name: '중복 미허용' }))

    await waitFor(() => {
      expect(screen.queryByText('Duplicate Allowed Ticket')).not.toBeInTheDocument()
      expect(screen.getByText('No Duplicate Ticket')).toBeInTheDocument()
    })
  })

  it('필터 결과가 없으면 중복 허용 전용 빈 상태를 표시한다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 2,
          name: 'No Duplicate Ticket',
          venue: 'KSPO DOME',
          googlePlaceId: 'place-2',
          detailAddress: '2층',
          validDate: '2026-09-02',
          openAt: '2026-09-02T10:00:00Z',
          status: 'ISSUING',
          issuedCount: 10,
          totalCount: 50,
          allowDuplicate: false,
          maxPerUser: 1,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)
    await screen.findByText('No Duplicate Ticket')

    await user.click(screen.getByRole('button', { name: '중복 허용' }))

    await waitFor(() => {
      expect(screen.getByText('중복 구매를 허용한 티켓이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('No Duplicate Ticket')).not.toBeInTheDocument()
    })
  })

  it('필터 결과가 없으면 중복 미허용 전용 빈 상태를 표시한다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: 'Duplicate Allowed Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'place-1',
          detailAddress: '1층',
          validDate: '2026-09-01',
          openAt: '2026-09-01T10:00:00Z',
          status: 'VERIFYING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
      ],
    }) as unknown as Response)

    render(<MyTicketsPage />)
    await screen.findByText('Duplicate Allowed Ticket')

    await user.click(screen.getByRole('button', { name: '중복 미허용' }))

    await waitFor(() => {
      expect(screen.getByText('중복 구매를 제한한 티켓이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('Duplicate Allowed Ticket')).not.toBeInTheDocument()
    })
  })

  it('이미지 업로드 후 PATCH 실패 시 cleanup API를 호출한다', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 42,
          name: 'Cleanup Ticket',
          venue: '잠실실내체육관',
          googlePlaceId: 'ChIJBACKEND',
          detailAddress: '1층 입구',
          validDate: '2026-09-01',
          openAt: '2026-09-01T09:00:00Z',
          imageKey: 'owner-1/42/original.png',
          imageUrl: '/api/tickets/42/image',
          status: 'ISSUING',
          issuedCount: 25,
          totalCount: 100,
          allowDuplicate: true,
          maxPerUser: 2,
        },
      ],
    }) as unknown as Response)

    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/tickets/42/image' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            imageKey: 'owner-1/42/new.png',
            imageUrl: '/api/tickets/42/image',
          }),
        } as Response
      }

      if (url === '/api/tickets/42' && init?.method === 'PATCH') {
        return {
          ok: false,
          json: async () => ({ message: 'patch failed' }),
        } as Response
      }

      if (url === '/api/tickets/42/image?imageKey=owner-1%2F42%2Fnew.png' && init?.method === 'DELETE') {
        return new Response(null, { status: 204 }) as Response
      }

      return {
        ok: true,
        json: async () => [],
      } as Response
    })

    render(<MyTicketsPage />)
    await screen.findByText('Cleanup Ticket')

    await user.click(screen.getByRole('button', { name: '수정' }))
    const file = new File(['png'], 'cover.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('대표 이미지'), file)
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/tickets/42/image?imageKey=owner-1%2F42%2Fnew.png',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    expect(screen.getByText('patch failed')).toBeInTheDocument()
  })
})
