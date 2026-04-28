import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MyTicketsPage from '../page'

vi.mock('next-intl', () => ({
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
      'myTickets.fieldVenueMap': 'Google Maps로 장소 선택',
      'myTickets.fieldVenueMapHelper': '입력한 사용 장소를 Google Maps에서 확인합니다.',
      'myTickets.fieldDetailAddress': '세부 주소',
      'myTickets.fieldDetailAddressPlaceholder': '예) 2층 A게이트 앞',
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
  it('티켓 발급 폼에서 Google Maps 장소 선택 링크와 세부 주소 입력을 제공한다', async () => {
    const user = userEvent.setup()
    render(<MyTicketsPage />)

    await user.click(screen.getByRole('button', { name: '티켓 발급' }))

    expect(screen.getByLabelText('사용 장소')).toBeInTheDocument()
    expect(screen.getByLabelText('세부 주소')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Google Maps로 장소 선택' })).toHaveAttribute('aria-disabled', 'true')

    await user.type(screen.getByLabelText('사용 장소'), '올림픽공원 체조경기장')

    expect(screen.getByRole('link', { name: 'Google Maps로 장소 선택' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=%EC%98%AC%EB%A6%BC%ED%94%BD%EA%B3%B5%EC%9B%90%20%EC%B2%B4%EC%A1%B0%EA%B2%BD%EA%B8%B0%EC%9E%A5'
    )
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

    const ticket = screen.getByText('PERFO Test Ticket').closest('article')

    expect(ticket).not.toBeNull()
    expect(within(ticket as HTMLElement).getByText('올림픽공원 체조경기장')).toBeInTheDocument()
    expect(within(ticket as HTMLElement).getByText('2층 A게이트 앞')).toBeInTheDocument()
  })
})
