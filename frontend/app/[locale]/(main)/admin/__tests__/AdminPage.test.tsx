import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AdminPage from "../page"
import { loadAdminDashboardSummary } from "../admin-dashboard.func"

const getServerSession = vi.fn()
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`)
})

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}))

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}))

vi.mock("../admin-dashboard.func", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../admin-dashboard.func")>()

  return {
    ...actual,
    loadAdminDashboardSummary: vi.fn(),
  }
})

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "admin.title": "어드민 대시보드",
      "admin.description": "운영 상태",
      "admin.kpiVerifying": "검표중 티켓",
      "admin.kpiTotalTickets": "총 발급 티켓",
      "admin.kpiNotifications": "최근 알림",
      "admin.kpiRepresentative": "대표 티켓 상태",
      "admin.quickActions": "빠른 액션",
      "admin.actionManageTickets": "티켓 발급 관리",
      "admin.actionStartScan": "첫 검표중 티켓 검표 시작",
      "admin.actionNoVerifyingTicket": "검표중 티켓 없음",
      "admin.actionNotifications": "알림 센터",
      "admin.actionEvents": "공개 이벤트 확인",
      "admin.recentTickets": "최근 티켓",
      "admin.recentNotifications": "최근 운영 알림",
      "admin.more": "더보기",
      "admin.openPublicEvent": "공개",
      "admin.scan": "검표",
      "admin.statusVerifying": "검표중",
      "admin.statusIssuing": "발급중",
      "admin.statusInactive": "비활성화",
      "admin.statusExpired": "기간만료",
      "admin.emptyTickets": "최근 발급 티켓이 없습니다.",
      "admin.emptyNotifications": "최근 운영 알림이 없습니다.",
      "admin.ticketsFallback": "티켓 데이터를 불러오지 못했습니다.",
      "admin.notificationsFallback": "알림 데이터를 불러오지 못했습니다.",
    }

    return messages[key] ?? key
  },
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

describe("AdminPage", () => {
  beforeEach(() => {
    getServerSession.mockReset()
    redirect.mockClear()
    vi.mocked(loadAdminDashboardSummary).mockReset()
  })

  it("ADMIN이면 대시보드를 렌더링한다", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
    })
    vi.mocked(loadAdminDashboardSummary).mockResolvedValue({
      kpis: {
        verifyingTicketCount: 1,
        totalIssuedTicketCount: 2,
        recentNotificationCount: 1,
        representativeTicketSummary: "PERFO 24/100",
      },
      firstVerifyingTicket: {
        id: "42",
        name: "PERFO",
        venue: "Olympic Park",
        status: "VERIFYING",
        issuedCount: 24,
        totalCount: 100,
        publicBookingPath: "/events/42",
      },
      recentTickets: [
        {
          id: "42",
          name: "PERFO",
          venue: "Olympic Park",
          status: "VERIFYING",
          issuedCount: 24,
          totalCount: 100,
          publicBookingPath: "/events/42",
        },
      ],
      recentNotifications: [
        {
          id: "n1",
          title: "검표 시작",
          body: "검표가 시작되었습니다.",
          ticketName: "PERFO",
          targetUrl: "/ko/my-tickets/42/scan",
          readAt: null,
          createdAt: "2026-05-27T07:00:00.000Z",
        },
      ],
      dataState: {
        ticketsAvailable: true,
        notificationsAvailable: true,
      },
    })

    render(await AdminPage({ params: Promise.resolve({ locale: "ko" }) }))

    expect(screen.getByRole("heading", { name: "어드민 대시보드" })).toBeInTheDocument()
    expect(screen.getByText("PERFO")).toBeInTheDocument()
    expect(screen.getByText("검표 시작")).toBeInTheDocument()
    expect(loadAdminDashboardSummary).toHaveBeenCalledWith(
      expect.objectContaining({ id: "admin-1", role: "ADMIN" })
    )
  })

  it("비ADMIN이면 unauthorized로 보낸다", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", role: "USER" },
    })

    await expect(AdminPage({ params: Promise.resolve({ locale: "ko" }) }))
      .rejects
      .toThrow("redirect:/ko/unauthorized")

    expect(loadAdminDashboardSummary).not.toHaveBeenCalled()
  })
})
