import { NextRequest, NextResponse } from "next/server";
import { syncTicketNotifications } from "@/lib/notifications/notification-service";
import { withRequiredSessionRoute, withRouteErrorHandling } from "@/lib/server/session-route";
import { isValidNotificationSyncPayload } from "../notification-route.func";

export const POST = async (request: NextRequest) => withRouteErrorHandling(
    async () => withRequiredSessionRoute(
        () => NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        async (user) => {
        const payload = await request.json();
        if (!isValidNotificationSyncPayload(payload)) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const createdNotificationIds = await syncTicketNotifications(user.id, payload.tickets);
        return NextResponse.json({ createdNotificationIds });
        },
    ),
    (error) => {
        console.error("Notification sync failed:", error);
        return NextResponse.json({ message: "Notification sync failed" }, { status: 500 });
    },
);
