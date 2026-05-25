"use client";

import { useLocale, useTranslations } from "next-intl";
import { BookableTicketCard } from "@/components/tickets/BookableTicketCard";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import PublicBookingButton from "@/components/events/PublicBookingButton";
import type { PublicEvent } from "@/lib/events/public-events";

type PublicEventDetailPageContentProps = {
  event: PublicEvent;
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

const PublicEventDetailPageContent = ({
  event,
}: PublicEventDetailPageContentProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));

  return (
    <PageShell className="ds-shell">
      <div className="px-5 pb-28 pt-8">
        <PageSection spacing="lg">
          <BookableTicketCard
            ticket={event}
            statusLabel={saleStatusLabel(event.saleStatus, t)}
            badgeVariant={saleStatusBadgeVariant(event.saleStatus)}
            remainingLabel={t("events.remainingLabel")}
            linkOnlyLabel={t("events.discoveryLinkOnly")}
            showLinkOnlyChip={false}
            showValidDateRow={false}
            footer={
              <PublicBookingButton
                callbackPath={`/${locale}/events/${event.id}`}
                eventId={event.id}
                idleLabel={t("events.bookNow")}
                pendingLabel={t("events.booking")}
                errorLabel={t("events.bookingFailed")}
                resultMessages={{
                  DUPLICATE_PURCHASE: t("events.bookingDuplicatePurchase"),
                  ALREADY_USED: t("events.bookingAlreadyUsed"),
                  NOT_OPEN: t("events.bookingNotOpen"),
                  SALE_CLOSED: t("events.bookingSaleClosed"),
                }}
              />
            }
          >
            <div className="grid grid-cols-1 gap-2 text-sm text-[var(--text)]">
              <p>{t("events.detailSaleOpenSentence", { date: formatDateTime(event.saleOpenAt) })}</p>
              <p>{t("events.detailSaleCloseSentence", { date: formatDateTime(event.saleCloseAt) })}</p>
              <p>{t("events.detailPurchaseLimitSentence", { count: event.maxPerUser })}</p>
              {event.discoveryMode === "LINK_ONLY" ? (
                <p>{t("events.detailLinkOnlySentence")}</p>
              ) : null}
            </div>
          </BookableTicketCard>
        </PageSection>
      </div>
    </PageShell>
  );
};

export default PublicEventDetailPageContent;
