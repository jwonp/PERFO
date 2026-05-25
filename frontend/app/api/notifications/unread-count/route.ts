import { NextResponse } from "next/server";
import { getUnreadNotificationCount } from "@/lib/notifications/notification-service";
import { withRequiredSessionRoute, withRouteErrorHandling } from "@/lib/server/session-route";

export const GET = async () => withRouteErrorHandling(
    async () => withRequiredSessionRoute(
        () => NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        async (user) => {
            const count = await getUnreadNotificationCount(user.id);
            return NextResponse.json({ count });
        },
    ),
    (error) => {
        console.error("Unread notification count failed:", error);
        return NextResponse.json({ message: "Unread notification count failed" }, { status: 500 });
    },
);
