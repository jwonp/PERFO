import { NextResponse } from "next/server";
import { getUnreadNotificationCount } from "@/lib/notifications/notification-service";
import { getRequiredSessionUser } from "@/lib/server/session";

export const GET = async () => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadNotificationCount(user.id);
    return NextResponse.json({ count });
};
