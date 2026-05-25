import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/notifications/notification-service";
import { withRequiredSessionRoute } from "@/lib/server/session-route";

export const PATCH = async () => withRequiredSessionRoute(
    () => NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    async (user) => {
        const updatedCount = await markAllNotificationsRead(user.id);
        return NextResponse.json({ updatedCount });
    },
);
