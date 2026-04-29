export type ReservedTicketingStatus =
    | "PENDING"
    | "PROCESSING"
    | "SUCCESS"
    | "FAILED"
    | "SOLD_OUT"
    | "DUPLICATE";

export type ReservedUsageStatus =
    | "BEFORE_USE"
    | "WAITING"
    | "MY_TURN"
    | "USED"
    | "EXPIRED";

export type IssuedTicketStatus =
    | "INACTIVE"
    | "ISSUING"
    | "VERIFYING"
    | "EXPIRED";

export type NotificationType =
    | "TICKET_PROCESSING"
    | "TICKET_SUCCESS"
    | "TICKET_FAILED"
    | "TICKET_SOLD_OUT"
    | "TICKET_DUPLICATE"
    | "TICKET_MY_TURN"
    | "TICKET_USED"
    | "TICKET_EXPIRED"
    | "ISSUED_TICKET_VERIFYING"
    | "ISSUED_TICKET_EXPIRED";

export type TicketStatusScope = "reserved" | "issued";
export type TicketStatusKey = "ticketingStatus" | "usageStatus" | "issueStatus";

export type TicketStatusCandidate = {
    statusKey: TicketStatusKey;
    statusValue: string;
};

export type NotificationItem = {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    targetUrl: string;
    sourceType: TicketStatusScope;
    sourceId: string;
    dedupeKey: string;
    readAt: string | null;
    createdAt: string;
};

export type NotificationListItem = NotificationItem & {
    ticketName: string;
};

export type PushSubscriptionData = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};

export type PushPayload = {
    title: string;
    body: string;
    url: string;
    tag: string;
    icon?: string;
};

export type NotificationRequested = {
    type: NotificationType;
    title: string;
    body: string;
    targetUrl: string;
    dedupeKey: string;
};

export type NotificationSyncTicket = {
    scope: TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statuses: TicketStatusCandidate[];
};
