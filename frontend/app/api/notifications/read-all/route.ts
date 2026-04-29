import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/notifications/notification-service";
import { getRequiredSessionUser } from "@/lib/server/session";

export const PATCH = async () => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const updatedCount = await markAllNotificationsRead(user.id);
    return NextResponse.json({ updatedCount });
};
