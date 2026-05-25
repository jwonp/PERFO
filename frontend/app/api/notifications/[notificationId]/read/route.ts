import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/notifications/notification-service";
import { withRequiredSessionRoute } from "@/lib/server/session-route";

export const PATCH = async (
    _request: Request,
    { params }: { params: Promise<{ notificationId: string }> },
) => withRequiredSessionRoute(
    () => NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    async (user) => {
        const { notificationId } = await params;
        const notification = await markNotificationRead(user.id, notificationId);
        if (!notification) {
            return NextResponse.json({ message: "Notification not found" }, { status: 404 });
        }

        return NextResponse.json({ notification });
    },
);
