import { NextRequest, NextResponse } from "next/server";
import { bootstrapTicketSnapshots } from "@/lib/notifications/notification-service";
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

        await bootstrapTicketSnapshots(user.id, payload.tickets);
        return NextResponse.json({ success: true });
        },
    ),
    (error) => {
        console.error("Notification bootstrap failed:", error);
        return NextResponse.json({ message: "Notification bootstrap failed" }, { status: 500 });
    },
);
