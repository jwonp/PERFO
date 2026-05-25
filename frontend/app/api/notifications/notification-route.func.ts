import { isSafeInternalTargetUrl } from "@/lib/notifications/notification.constants";
import type { NotificationSyncTicket, TicketStatusScope } from "@/lib/notifications/notification.types";

export const isValidTicketStatusScope = (
    value: string,
): value is TicketStatusScope => value === "reserved" || value === "issued";

export const isValidNotificationSyncPayload = (
    value: unknown,
): value is { tickets: NotificationSyncTicket[] } => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const payload = value as { tickets?: NotificationSyncTicket[] };
    if (!Array.isArray(payload.tickets)) {
        return false;
    }

    return payload.tickets.every((ticket) => {
        return (
            typeof ticket.ticketId === "string" &&
            typeof ticket.ticketName === "string" &&
            typeof ticket.targetUrl === "string" &&
            isValidTicketStatusScope(ticket.scope) &&
            isSafeInternalTargetUrl(ticket.targetUrl) &&
            Array.isArray(ticket.statuses) &&
            ticket.statuses.every((candidate) => {
                return typeof candidate.statusKey === "string"
                    && typeof candidate.statusValue === "string";
            })
        );
    });
};
