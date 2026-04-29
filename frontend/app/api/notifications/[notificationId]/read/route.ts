import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/notifications/notification-service";
import { getRequiredSessionUser } from "@/lib/server/session";

export const PATCH = async (
    _request: Request,
    { params }: { params: Promise<{ notificationId: string }> },
) => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await params;
    const notification = await markNotificationRead(user.id, notificationId);
    if (!notification) {
        return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
};
