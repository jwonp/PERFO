"use client";

import { useTranslations } from "next-intl";
import PageEmptyState from "@/components/layout/PageEmptyState";
import { IssuedTicketCard } from "@/components/tickets/IssuedTicketCard";
import { statusBadgeStyle } from "./my-tickets.func";
import type { IssueStatus, TicketListProps } from "./my-tickets.types";

const statusLabel = (status: IssueStatus, t: ReturnType<typeof useTranslations>): string => {
    const map: Record<IssueStatus, string> = {
        ISSUING: t("myTickets.statusIssuing"),
        INACTIVE: t("myTickets.statusInactive"),
        EXPIRED: t("myTickets.statusExpired"),
        VERIFYING: t("myTickets.statusVerifying"),
    };
    return map[status];
};

const TicketList = ({
    filteredTickets,
    hasLoadedTickets,
    locale,
    copiedTicketId,
    canShareBookingUrl,
    emptyStateTitle,
    onEdit,
    onCopyBookingUrl,
    onShareBookingUrl,
    t,
}: TicketListProps) => {
    if (hasLoadedTickets && filteredTickets.length === 0) {
        return (
            <PageEmptyState
                title={emptyStateTitle}
                description={t("myTickets.emptyDescription")}
                icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14">
                        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                        <polyline points="9 12 11 14 15 10" />
                    </svg>
                }
            />
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5">
            {filteredTickets.map((ticket, index) => (
                <IssuedTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    isLCP={index === 0}
                    statusLabel={statusLabel(ticket.status, t)}
                    badgeVariant={statusBadgeStyle(ticket.status)}
                    issuedCountLabel={t("myTickets.issuedCount")}
                    editLabel={t("myTickets.edit")}
                    scanLabel={t("myTickets.scan")}
                    linkOnlyLabel={t("myTickets.linkOnlyBadge")}
                    canScan={ticket.status === "ISSUING" || ticket.status === "VERIFYING"}
                    scanHref={`/${locale}/my-tickets/${ticket.id}/scan`}
                    onEdit={() => onEdit(ticket)}
                    copyBookingUrlLabel={t("myTickets.copyBookingUrl")}
                    shareBookingUrlLabel={t("myTickets.shareBookingUrl")}
                    copySuccessMessage={copiedTicketId === ticket.id ? t("myTickets.copySuccess") : null}
                    canShareBookingUrl={canShareBookingUrl}
                    onCopyBookingUrl={() => void onCopyBookingUrl(ticket)}
                    onShareBookingUrl={() => void onShareBookingUrl(ticket)}
                />
            ))}
        </div>
    );
};

export { TicketList };
