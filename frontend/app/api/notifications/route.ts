import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/notifications/notification-service";
import { withRequiredSessionRoute } from "@/lib/server/session-route";

export const GET = async () => withRequiredSessionRoute(
    () => NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    async (user) => {
        const notifications = await listNotifications(user.id);
        return NextResponse.json({ notifications });
    },
);
