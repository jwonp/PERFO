"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { NotificationListItem } from "@/lib/notifications/notification.types";
import { countUnreadNotifications } from "./notifications.func";

export const useNotificationsPage = () => {
    const t = useTranslations("notifications");
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const unreadCount = countUnreadNotifications(notifications);

    useEffect(() => {
        let cancelled = false;

        const loadNotifications = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/notifications", { cache: "no-store" });
                if (!response.ok) {
                    throw new Error("notifications fetch failed");
                }

                const body = (await response.json()) as { notifications?: NotificationListItem[] };
                if (!cancelled) {
                    setNotifications(body.notifications ?? []);
                }
            } catch {
                if (!cancelled) {
                    setError(t("loadError"));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadNotifications();

        return () => {
            cancelled = true;
        };
    }, [t]);

    const markRead = async (notificationId: string) => {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
            method: "PATCH",
        });

        if (!response.ok) {
            throw new Error("mark read failed");
        }

        setNotifications((current) => {
            const timestamp = new Date().toISOString();
            return current.map((item) => {
                return item.id === notificationId
                    ? { ...item, readAt: item.readAt ?? timestamp }
                    : item;
            });
        });
    };

    const handleNotificationClick = async (notification: NotificationListItem) => {
        if (!notification.readAt) {
            try {
                await markRead(notification.id);
            } catch {
                setError(t("readError"));
                return;
            }
        }

        router.push(notification.targetUrl);
    };

    const handleReadAll = async () => {
        try {
            const response = await fetch("/api/notifications/read-all", {
                method: "PATCH",
            });

            if (!response.ok) {
                throw new Error("read all failed");
            }

            const timestamp = new Date().toISOString();
            setNotifications((current) => current.map((item) => ({
                ...item,
                readAt: item.readAt ?? timestamp,
            })));
        } catch {
            setError(t("readAllError"));
        }
    };

    return {
        t,
        router,
        notifications,
        loading,
        error,
        unreadCount,
        handleNotificationClick,
        handleReadAll,
        markRead,
    };
};
