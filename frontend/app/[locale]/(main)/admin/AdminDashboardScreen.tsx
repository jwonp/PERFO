"use client"

import type React from "react"
import { Bell, CalendarDays, CheckCircle2, ClipboardList, Gauge, QrCode, Ticket } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import PageHeader from "@/components/layout/PageHeader"
import PageSection from "@/components/layout/PageSection"
import PageShell from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import type {
  AdminDashboardScreenProps,
  AdminDashboardTicketStatus,
} from "./admin-dashboard.types"

const statusLabelKey: Record<AdminDashboardTicketStatus, string> = {
  ISSUING: "admin.statusIssuing",
  INACTIVE: "admin.statusInactive",
  EXPIRED: "admin.statusExpired",
  VERIFYING: "admin.statusVerifying",
}

const formatDateTime = (value: string, locale: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

const AdminDashboardScreen = ({
  locale,
  summary,
}: AdminDashboardScreenProps) => {
  const t = useTranslations()
  const firstVerifyingTicket = summary.firstVerifyingTicket

  return (
    <PageShell className="ds-shell">
      <div className="space-y-6 px-5 pb-32 pt-8">
        <PageHeader
          title={t("admin.title")}
          description={t("admin.description")}
        />

        <section className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<QrCode className="size-4" />}
            label={t("admin.kpiVerifying")}
            value={String(summary.kpis.verifyingTicketCount)}
          />
          <KpiCard
            icon={<Ticket className="size-4" />}
            label={t("admin.kpiTotalTickets")}
            value={String(summary.kpis.totalIssuedTicketCount)}
          />
          <KpiCard
            icon={<Bell className="size-4" />}
            label={t("admin.kpiNotifications")}
            value={String(summary.kpis.recentNotificationCount)}
          />
          <KpiCard
            icon={<Gauge className="size-4" />}
            label={t("admin.kpiRepresentative")}
            value={summary.kpis.representativeTicketSummary}
          />
        </section>

        <PageSection spacing="md">
          <h2 className="px-1 text-sm font-semibold text-[var(--text-muted)]">
            {t("admin.quickActions")}
          </h2>
          <div className="grid gap-2">
            <ActionLink href="/my-tickets" icon={<ClipboardList className="size-5" />}>
              {t("admin.actionManageTickets")}
            </ActionLink>
            {firstVerifyingTicket ? (
              <ActionLink
                href={`/my-tickets/${firstVerifyingTicket.id}/scan`}
                icon={<QrCode className="size-5" />}
              >
                {t("admin.actionStartScan")}
              </ActionLink>
            ) : (
              <DisabledAction icon={<QrCode className="size-5" />}>
                {t("admin.actionNoVerifyingTicket")}
              </DisabledAction>
            )}
            <ActionLink href="/notifications" icon={<Bell className="size-5" />}>
              {t("admin.actionNotifications")}
            </ActionLink>
            <ActionLink href="/events" icon={<CalendarDays className="size-5" />}>
              {t("admin.actionEvents")}
            </ActionLink>
          </div>
        </PageSection>

        <PageSection spacing="md">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">
              {t("admin.recentTickets")}
            </h2>
            <Button asChild variant="ghost" size="xs">
              <Link href="/my-tickets">{t("admin.more")}</Link>
            </Button>
          </div>

          {!summary.dataState.ticketsAvailable ? (
            <FallbackPanel>{t("admin.ticketsFallback")}</FallbackPanel>
          ) : summary.recentTickets.length === 0 ? (
            <FallbackPanel>{t("admin.emptyTickets")}</FallbackPanel>
          ) : (
            <div className="space-y-3">
              {summary.recentTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-lg border border-border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-panel)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[var(--text)]">
                        {ticket.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                        {ticket.venue}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                      {t(statusLabelKey[ticket.status])}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      {ticket.issuedCount} / {ticket.totalCount}
                    </p>
                    <div className="flex gap-2">
                      {ticket.publicBookingPath ? (
                        <Button asChild variant="outline" size="xs">
                          <Link href={ticket.publicBookingPath}>
                            {t("admin.openPublicEvent")}
                          </Link>
                        </Button>
                      ) : null}
                      {ticket.status === "VERIFYING" ? (
                        <Button asChild variant="default" size="xs">
                          <Link href={`/my-tickets/${ticket.id}/scan`}>
                            {t("admin.scan")}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection spacing="md">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-[var(--text-muted)]">
              {t("admin.recentNotifications")}
            </h2>
            <Button asChild variant="ghost" size="xs">
              <Link href="/notifications">{t("admin.more")}</Link>
            </Button>
          </div>

          {!summary.dataState.notificationsAvailable ? (
            <FallbackPanel>{t("admin.notificationsFallback")}</FallbackPanel>
          ) : summary.recentNotifications.length === 0 ? (
            <FallbackPanel>{t("admin.emptyNotifications")}</FallbackPanel>
          ) : (
            <div className="space-y-3">
              {summary.recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.targetUrl}
                  className="block rounded-lg border border-border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-panel)]"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className={`mt-0.5 size-4 ${
                        notification.readAt ? "text-[var(--text-subtle)]" : "text-primary"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-[var(--text)]">
                        {notification.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                        {notification.body}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-[var(--text-subtle)]">
                        {notification.ticketName} · {formatDateTime(notification.createdAt, locale)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </PageShell>
  )
}

const KpiCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) => (
  <article className="min-h-28 rounded-lg border border-border bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-panel)]">
    <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-primary">
      {icon}
    </div>
    <p className="text-[11px] font-semibold text-[var(--text-muted)]">{label}</p>
    <p className="mt-1 line-clamp-2 break-words text-xl font-extrabold text-[var(--text)]">
      {value}
    </p>
  </article>
)

const ActionLink = ({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <Button asChild variant="outline" className="h-14 justify-start rounded-lg px-4">
    <Link href={href}>
      {icon}
      <span>{children}</span>
    </Link>
  </Button>
)

const DisabledAction = ({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <Button variant="outline" className="h-14 justify-start rounded-lg px-4" disabled>
    {icon}
    <span>{children}</span>
  </Button>
)

const FallbackPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-dashed border-border bg-[var(--surface-muted)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
    {children}
  </div>
)

export default AdminDashboardScreen
