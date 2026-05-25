"use client";

import { NotificationsScreen } from "./NotificationsScreen";
import { useNotificationsPage } from "./use-notifications-page.hooks";

const NotificationsPage = () => {
    const {
        t,
        router,
        notifications,
        loading,
        error,
        unreadCount,
        handleNotificationClick,
        handleReadAll,
        markRead,
    } = useNotificationsPage();

    return (
        <NotificationsScreen
            t={t}
            notifications={notifications}
            loading={loading}
            error={error}
            unreadCount={unreadCount}
            onBack={() => router.back()}
            onReadAll={() => void handleReadAll()}
            onNotificationClick={(notification) => void handleNotificationClick(notification)}
            onMarkRead={(notificationId) => void markRead(notificationId)}
        />
    );
};

export default NotificationsPage;
