"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookableTicketCard } from "@/components/tickets/BookableTicketCard";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";
import PageEmptyState from "@/components/layout/PageEmptyState";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import type { PublicEvent } from "@/lib/events/public-events";

type PublicEventsPageContentProps = {
  events: PublicEvent[];
};

const saleStatusLabel = (
  status: PublicEvent["saleStatus"],
  t: ReturnType<typeof useTranslations>,
) => {
  switch (status) {
    case "UPCOMING":
      return t("events.saleStatusUpcoming");
    case "OPEN":
      return t("events.saleStatusOpen");
    case "SOLD_OUT":
      return t("events.saleStatusSoldOut");
    case "CLOSED":
      return t("events.saleStatusClosed");
    default:
      return t("events.saleStatusInactive");
  }
};

const saleStatusBadgeVariant = (
  status: PublicEvent["saleStatus"],
): TicketBadgeVariant => {
  switch (status) {
    case "OPEN":
      return "success";
    case "UPCOMING":
      return "warning";
    case "SOLD_OUT":
      return "danger";
    default:
      return "neutral";
  }
};

const PublicEventsPageContent = ({
  events,
}: PublicEventsPageContentProps) => {
  const t = useTranslations();

  return (
    <PageShell className="ds-shell">
      <div className="px-5 pb-28 pt-8">
        <PageSection spacing="lg">
          <PageHeader title={t("events.title")} />

          {events.length === 0 ? (
            <PageEmptyState title={t("events.empty")} />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={ticket.publicBookingPath ?? `/events/${ticket.id}`}
                  className="block transition-transform hover:-translate-y-0.5"
                >
                  <BookableTicketCard
                    ticket={ticket}
                    statusLabel={saleStatusLabel(ticket.saleStatus, t)}
                    badgeVariant={saleStatusBadgeVariant(ticket.saleStatus)}
                    remainingLabel={t("events.remainingLabel")}
                    linkOnlyLabel={t("events.discoveryLinkOnly")}
                  />
                </Link>
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </PageShell>
  );
};

export default PublicEventsPageContent;
