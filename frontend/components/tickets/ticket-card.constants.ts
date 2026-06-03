import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";
import type { TicketUsageStatus } from "@/components/tickets/ticket-card.types";

export const TICKET_STATUS_META: Record<
    TicketUsageStatus,
    { label: string; badge: TicketBadgeVariant; dateSuffix: string }
> = {
    BEFORE_USE: {
        label: "BEFORE SERVING",
        badge: "outline",
        dateSuffix: "오픈",
    },
    WAITING: {
        label: "WAITING",
        badge: "secondary",
        dateSuffix: "오픈",
    },
    MY_TURN: {
        label: "NOW SERVING",
        badge: "default",
        dateSuffix: "까지 유효",
    },
    USED: {
        label: "EXPIRED",
        badge: "secondary",
        dateSuffix: "만료",
    },
};
