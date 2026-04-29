import { NextRequest, NextResponse } from "next/server";
import { bootstrapTicketSnapshots } from "@/lib/notifications/notification-service";
import { isSafeInternalTargetUrl } from "@/lib/notifications/notification.constants";
import { getRequiredSessionUser } from "@/lib/server/session";
import type { NotificationSyncTicket, TicketStatusScope } from "@/lib/notifications/notification.types";

const isValidScope = (value: string): value is TicketStatusScope => {
    return value === "reserved" || value === "issued";
};

const isValidPayload = (value: unknown): value is { tickets: NotificationSyncTicket[] } => {
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
            isValidScope(ticket.scope) &&
            isSafeInternalTargetUrl(ticket.targetUrl) &&
            Array.isArray(ticket.statuses) &&
            ticket.statuses.every((candidate) => {
                return typeof candidate.statusKey === "string" && typeof candidate.statusValue === "string";
            })
        );
    });
};

export const POST = async (request: NextRequest) => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    if (!isValidPayload(payload)) {
        return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    await bootstrapTicketSnapshots(user.id, payload.tickets);
    return NextResponse.json({ success: true });
};
