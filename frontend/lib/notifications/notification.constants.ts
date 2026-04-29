import type {
    IssuedTicketStatus,
    NotificationRequested,
    NotificationType,
    ReservedTicketingStatus,
    ReservedUsageStatus,
    TicketStatusKey,
    TicketStatusScope,
} from "@/lib/notifications/notification.types";

type TransitionInput = {
    scope: TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statusKey: TicketStatusKey;
    previousStatus: string | null;
    nextStatus: string;
};

type TransitionDefinition = {
    type: NotificationType;
    title: string;
    body: (ticketName: string) => string;
};

const RESERVED_TICKETING: Partial<Record<ReservedTicketingStatus, TransitionDefinition>> = {
    PROCESSING: {
        type: "TICKET_PROCESSING",
        title: "티켓 요청 처리 중",
        body: (ticketName) => `${ticketName} 요청을 처리하고 있습니다.`,
    },
    SUCCESS: {
        type: "TICKET_SUCCESS",
        title: "티켓 예약 완료",
        body: (ticketName) => `${ticketName} 예약이 완료되었습니다.`,
    },
    FAILED: {
        type: "TICKET_FAILED",
        title: "티켓 예약 실패",
        body: (ticketName) => `${ticketName} 예약에 실패했습니다.`,
    },
    SOLD_OUT: {
        type: "TICKET_SOLD_OUT",
        title: "티켓 소진",
        body: (ticketName) => `${ticketName} 준비 수량이 모두 소진되었습니다.`,
    },
    DUPLICATE: {
        type: "TICKET_DUPLICATE",
        title: "중복 신청 감지",
        body: (ticketName) => `${ticketName}은 이미 신청한 티켓입니다.`,
    },
};

const RESERVED_USAGE: Partial<Record<ReservedUsageStatus, TransitionDefinition>> = {
    MY_TURN: {
        type: "TICKET_MY_TURN",
        title: "입장 차례 도착",
        body: (ticketName) => `${ticketName} 입장 차례입니다. QR을 준비해 주세요.`,
    },
    USED: {
        type: "TICKET_USED",
        title: "티켓 사용 완료",
        body: (ticketName) => `${ticketName} 사용이 완료되었습니다.`,
    },
    EXPIRED: {
        type: "TICKET_EXPIRED",
        title: "티켓 만료",
        body: (ticketName) => `${ticketName} 사용 시간이 만료되었습니다.`,
    },
};

const ISSUED_STATUS: Partial<Record<IssuedTicketStatus, TransitionDefinition>> = {
    VERIFYING: {
        type: "ISSUED_TICKET_VERIFYING",
        title: "검표 시작 가능",
        body: (ticketName) => `${ticketName} 검표를 시작할 수 있습니다.`,
    },
    EXPIRED: {
        type: "ISSUED_TICKET_EXPIRED",
        title: "발급 티켓 만료",
        body: (ticketName) => `${ticketName} 유효 기간이 종료되었습니다.`,
    },
};

const buildDedupeKey = (
    scope: TicketStatusScope,
    ticketId: string,
    statusKey: TicketStatusKey,
    statusValue: string,
) => `${scope}:${ticketId}:${statusKey}:${statusValue}`;

export const buildNotificationRequestFromTransition = ({
    scope,
    ticketId,
    ticketName,
    targetUrl,
    statusKey,
    previousStatus,
    nextStatus,
}: TransitionInput): NotificationRequested | null => {
    if (previousStatus === nextStatus) {
        return null;
    }

    if (scope === "reserved" && statusKey === "ticketingStatus") {
        const definition = RESERVED_TICKETING[nextStatus as ReservedTicketingStatus];
        if (!definition) {
            return null;
        }

        return {
            type: definition.type,
            title: definition.title,
            body: definition.body(ticketName),
            targetUrl,
            dedupeKey: buildDedupeKey(scope, ticketId, statusKey, nextStatus),
        };
    }

    if (scope === "reserved" && statusKey === "usageStatus") {
        if (nextStatus === "USED" && previousStatus !== "MY_TURN" && previousStatus !== "NOW_SERVING") {
            return null;
        }

        const definition = RESERVED_USAGE[nextStatus as ReservedUsageStatus];
        if (!definition) {
            return null;
        }

        return {
            type: definition.type,
            title: definition.title,
            body: definition.body(ticketName),
            targetUrl,
            dedupeKey: buildDedupeKey(scope, ticketId, statusKey, nextStatus),
        };
    }

    if (scope === "issued" && statusKey === "issueStatus") {
        const definition = ISSUED_STATUS[nextStatus as IssuedTicketStatus];
        if (!definition) {
            return null;
        }

        return {
            type: definition.type,
            title: definition.title,
            body: definition.body(ticketName),
            targetUrl,
            dedupeKey: buildDedupeKey(scope, ticketId, statusKey, nextStatus),
        };
    }

    return null;
};

export const isSafeInternalTargetUrl = (value: string) => {
    return value.startsWith("/") && !value.startsWith("//") && !value.includes("://");
};
