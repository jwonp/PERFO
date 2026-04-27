import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";
import type { TicketUsageStatus } from "@/components/tickets/ticket-card.types";

export const TICKET_STATUS_META: Record<
    TicketUsageStatus,
    { label: string; badge: TicketBadgeVariant; dateSuffix: string }
> = {
    BEFORE_USE: {
        label: "BEFORE SERVING",
        badge: "info",
        dateSuffix: "오픈",
    },
    WAITING: {
        label: "WAITING",
        badge: "warning",
        dateSuffix: "오픈",
    },
    MY_TURN: {
        label: "NOW SERVING",
        badge: "success",
        dateSuffix: "까지 유효",
    },
    USED: {
        label: "EXPIRED",
        badge: "neutral",
        dateSuffix: "만료",
    },
};
