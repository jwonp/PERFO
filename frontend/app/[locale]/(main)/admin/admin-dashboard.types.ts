import type { AppLocale } from "@/lib/site"

export type AdminDashboardTicketStatus = "ISSUING" | "INACTIVE" | "EXPIRED" | "VERIFYING"

export type AdminDashboardTicket = {
  id: string
  eventId?: string
  name: string
  venue: string
  status: AdminDashboardTicketStatus
  issuedCount: number
  totalCount: number
  publicBookingPath?: string
}

export type AdminDashboardNotification = {
  id: string
  title: string
  body: string
  ticketName: string
  targetUrl: string
  readAt: string | null
  createdAt: string
}

export type AdminDashboardSummary = {
  kpis: {
    verifyingTicketCount: number
    totalIssuedTicketCount: number
    recentNotificationCount: number
    representativeTicketSummary: string
  }
  firstVerifyingTicket: AdminDashboardTicket | null
  recentTickets: AdminDashboardTicket[]
  recentNotifications: AdminDashboardNotification[]
  dataState: {
    ticketsAvailable: boolean
    notificationsAvailable: boolean
  }
}

export type AdminDashboardScreenProps = {
  locale: AppLocale
  summary: AdminDashboardSummary
}
