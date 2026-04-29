import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/notifications/notification-service";
import { getRequiredSessionUser } from "@/lib/server/session";

export const GET = async () => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const notifications = await listNotifications(user.id);
    return NextResponse.json({ notifications });
};
