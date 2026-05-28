import { parseBackendResponse } from "@/lib/server/backend-proxy/backend-proxy-response"
import {
  createBackendRouteClient,
  fetchBackendRoute,
} from "@/lib/server/backend-proxy/backend-proxy-route"
import { listNotifications } from "@/lib/notifications/notification-service"
import type { RouteSessionUser } from "@/lib/server/session-route"
import type {
  AdminDashboardNotification,
  AdminDashboardSummary,
  AdminDashboardTicket,
  AdminDashboardTicketStatus,
} from "./admin-dashboard.types"

const RECENT_TICKET_LIMIT = 5
const RECENT_NOTIFICATION_LIMIT = 5

const issueStatuses = new Set<AdminDashboardTicketStatus>([
  "ISSUING",
  "INACTIVE",
  "EXPIRED",
  "VERIFYING",
])

export const mapAdminDashboardTicket = (
  item: Record<string, unknown>
): AdminDashboardTicket => {
  const rawStatus = String(item.status ?? "INACTIVE")

  return {
    id: String(item.id),
    eventId: item.eventId ? String(item.eventId) : undefined,
    name: String(item.name ?? ""),
    venue: String(item.venue ?? ""),
    status: issueStatuses.has(rawStatus as AdminDashboardTicketStatus)
      ? (rawStatus as AdminDashboardTicketStatus)
      : "INACTIVE",
    issuedCount: Number(item.issuedCount ?? 0),
    totalCount: Number(item.totalCount ?? 0),
    publicBookingPath: item.publicBookingPath
      ? String(item.publicBookingPath)
      : undefined,
  }
}

export const buildAdminDashboardSummary = (
  tickets: AdminDashboardTicket[],
  notifications: AdminDashboardNotification[],
  options: {
    ticketsAvailable?: boolean
    notificationsAvailable?: boolean
  } = {}
): AdminDashboardSummary => {
  const recentTickets = tickets.slice(0, RECENT_TICKET_LIMIT)
  const recentNotifications = notifications.slice(0, RECENT_NOTIFICATION_LIMIT)
  const verifyingTickets = tickets.filter((ticket) => ticket.status === "VERIFYING")
  const representativeTicket = verifyingTickets[0] ?? tickets[0] ?? null
  const representativeTicketSummary = representativeTicket
    ? `${representativeTicket.name} ${representativeTicket.issuedCount}/${representativeTicket.totalCount}`
    : "No active ticket"

  return {
    kpis: {
      verifyingTicketCount: verifyingTickets.length,
      totalIssuedTicketCount: tickets.length,
      recentNotificationCount: recentNotifications.length,
      representativeTicketSummary,
    },
    firstVerifyingTicket: verifyingTickets[0] ?? null,
    recentTickets,
    recentNotifications,
    dataState: {
      ticketsAvailable: options.ticketsAvailable ?? true,
      notificationsAvailable: options.notificationsAvailable ?? true,
    },
  }
}

export const loadAdminDashboardSummary = async (
  user: RouteSessionUser
): Promise<AdminDashboardSummary> => {
  const [ticketsResult, notificationsResult] = await Promise.all([
    loadIssuedTickets(user),
    loadRecentNotifications(user.id),
  ])

  return buildAdminDashboardSummary(ticketsResult.tickets, notificationsResult.notifications, {
    ticketsAvailable: ticketsResult.available,
    notificationsAvailable: notificationsResult.available,
  })
}

const loadIssuedTickets = async (user: RouteSessionUser) => {
  const proxyClient = createBackendRouteClient(
    {
      id: user.id,
      email: user.email ?? null,
      role: user.role ?? null,
    },
    ["tickets"]
  )

  if (!proxyClient.ok) {
    return { tickets: [] as AdminDashboardTicket[], available: false }
  }

  try {
    const response = await fetchBackendRoute(
      proxyClient.value,
      `/api/tickets?ownerUserId=${encodeURIComponent(user.id)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    )
    const body = await parseBackendResponse(response, [])

    if (!response.ok || !Array.isArray(body)) {
      return { tickets: [] as AdminDashboardTicket[], available: false }
    }

    return {
      tickets: body.map((item) => mapAdminDashboardTicket(item as Record<string, unknown>)),
      available: true,
    }
  } catch {
    return { tickets: [] as AdminDashboardTicket[], available: false }
  }
}

const loadRecentNotifications = async (userId: string) => {
  try {
    const notifications = await listNotifications(userId)

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        ticketName: notification.ticketName,
        targetUrl: notification.targetUrl,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
      available: true,
    }
  } catch {
    return { notifications: [] as AdminDashboardNotification[], available: false }
  }
}
