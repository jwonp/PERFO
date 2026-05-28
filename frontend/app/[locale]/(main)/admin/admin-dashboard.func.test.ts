import { describe, expect, it } from "vitest"
import { buildAdminDashboardSummary, mapAdminDashboardTicket } from "./admin-dashboard.func"
import type { AdminDashboardNotification, AdminDashboardTicket } from "./admin-dashboard.types"

describe("admin-dashboard.func", () => {
  it("티켓과 알림으로 KPI와 preview 데이터를 만든다", () => {
    const tickets: AdminDashboardTicket[] = [
      {
        id: "42",
        name: "VERIFYING Ticket",
        venue: "Olympic Park",
        status: "VERIFYING",
        issuedCount: 24,
        totalCount: 100,
      },
      {
        id: "41",
        name: "Issuing Ticket",
        venue: "Jamsil",
        status: "ISSUING",
        issuedCount: 10,
        totalCount: 80,
      },
    ]
    const notifications: AdminDashboardNotification[] = [
      {
        id: "n1",
        title: "운영 알림",
        body: "검표가 시작되었습니다.",
        ticketName: "VERIFYING Ticket",
        targetUrl: "/ko/my-tickets/42/scan",
        readAt: null,
        createdAt: "2026-05-27T07:00:00.000Z",
      },
    ]

    const summary = buildAdminDashboardSummary(tickets, notifications)

    expect(summary.kpis).toEqual({
      verifyingTicketCount: 1,
      totalIssuedTicketCount: 2,
      recentNotificationCount: 1,
      representativeTicketSummary: "VERIFYING Ticket 24/100",
    })
    expect(summary.firstVerifyingTicket?.id).toBe("42")
    expect(summary.recentTickets).toHaveLength(2)
    expect(summary.recentNotifications).toHaveLength(1)
  })

  it("raw ticket status가 알 수 없는 값이면 INACTIVE로 정규화한다", () => {
    expect(mapAdminDashboardTicket({
      id: 1,
      name: "Ticket",
      venue: "Venue",
      status: "BROKEN",
      totalCount: 10,
    }).status).toBe("INACTIVE")
  })
})
