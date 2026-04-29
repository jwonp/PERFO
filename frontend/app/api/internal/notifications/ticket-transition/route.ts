import { NextRequest, NextResponse } from "next/server";
import { isSafeInternalTargetUrl } from "@/lib/notifications/notification.constants";
import { recordTicketStatusTransition } from "@/lib/notifications/notification-service";
import type { TicketStatusKey, TicketStatusScope } from "@/lib/notifications/notification.types";

type InternalTransitionPayload = {
    userId: string;
    scope: TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statusKey: TicketStatusKey;
    previousStatus: string | null;
    nextStatus: string;
};

const isValidPayload = (value: unknown): value is InternalTransitionPayload => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as InternalTransitionPayload;
    return Boolean(
        candidate.userId &&
        candidate.ticketId &&
        candidate.ticketName &&
        candidate.statusKey &&
        candidate.nextStatus &&
        (candidate.scope === "reserved" || candidate.scope === "issued") &&
        isSafeInternalTargetUrl(candidate.targetUrl),
    );
};

export const POST = async (request: NextRequest) => {
    const secret = process.env.INTERNAL_NOTIFICATION_SECRET;
    const requestSecret = request.headers.get("x-internal-notification-secret");

    if (!secret || requestSecret !== secret) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const payload = await request.json();
    if (!isValidPayload(payload)) {
        return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    const notificationId = await recordTicketStatusTransition(payload);
    return NextResponse.json({ notificationId });
};
