import type { NotificationListItem } from "@/lib/notifications/notification.types";

export const formatNotificationDateTime = (value: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
};

export const countUnreadNotifications = (notifications: NotificationListItem[]) => {
    return notifications.filter((item) => item.readAt === null).length;
};
