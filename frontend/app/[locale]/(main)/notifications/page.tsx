"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state";
import type { NotificationListItem } from "@/lib/notifications/notification.types";

const formatDateTime = (value: string) => {
    return new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
};

const NotificationsPage = () => {
    const t = useTranslations("notifications");
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const unreadCount = notifications.filter((item) => item.readAt === null).length;

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

    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-5 px-5 pt-8 pb-28">
                <header className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            aria-label={t("back")}
                            className="inline-flex size-8 items-center justify-center rounded-full text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)]"
                        >
                            <ArrowLeft className="size-5" />
                        </button>
                        <h1 className="flex-1 text-lg font-extrabold text-primary">{t("title")}</h1>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleReadAll()}
                            disabled={notifications.length === 0 || unreadCount === 0}
                        >
                            {t("readAll")}
                        </Button>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                        {t("summary", { count: unreadCount })}
                    </p>
                </header>

                {loading ? (
                    <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>
                ) : error ? (
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                ) : notifications.length === 0 ? (
                    <EmptyState>
                        <EmptyStateIcon>
                            <Bell className="h-12 w-12" />
                        </EmptyStateIcon>
                        <EmptyStateTitle>{t("empty")}</EmptyStateTitle>
                    </EmptyState>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <article
                                key={notification.id}
                                className={`rounded-2xl border p-4 ${
                                    notification.readAt
                                        ? "border-border bg-[var(--surface-raised)]"
                                        : "border-primary/20 bg-[color:color-mix(in_srgb,var(--primary)_7%,white)]"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => void handleNotificationClick(notification)}
                                        className="flex-1 text-left"
                                    >
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-bold text-[var(--text)]">
                                                {notification.title}
                                            </h2>
                                            {notification.readAt === null ? (
                                                <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden="true" />
                                            ) : null}
                                        </div>
                                        <p className="mt-2 text-sm text-[var(--text)]">{notification.body}</p>
                                        <p className="mt-2 text-xs text-[var(--text-muted)]">{notification.ticketName}</p>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                                            {formatDateTime(notification.createdAt)}
                                        </p>
                                    </button>
                                    {notification.readAt === null ? (
                                        <Button
                                            type="button"
                                            size="xs"
                                            variant="outline"
                                            onClick={() => void markRead(notification.id)}
                                        >
                                            {t("read")}
                                        </Button>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
