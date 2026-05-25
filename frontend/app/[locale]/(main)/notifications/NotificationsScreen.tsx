"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state";
import type { NotificationListItem } from "@/lib/notifications/notification.types";
import { formatNotificationDateTime } from "./notifications.func";

type NotificationsScreenProps = {
    t: (key: string, values?: Record<string, number>) => string;
    notifications: NotificationListItem[];
    loading: boolean;
    error: string | null;
    unreadCount: number;
    onBack: () => void;
    onReadAll: () => void;
    onNotificationClick: (notification: NotificationListItem) => void;
    onMarkRead: (notificationId: string) => void;
};

export const NotificationsScreen = ({
    t,
    notifications,
    loading,
    error,
    unreadCount,
    onBack,
    onReadAll,
    onNotificationClick,
    onMarkRead,
}: NotificationsScreenProps) => {
    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-5 px-5 pt-8 pb-28">
                <header className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={onBack}
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
                            onClick={() => void onReadAll()}
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
                                        onClick={() => void onNotificationClick(notification)}
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
                                            {formatNotificationDateTime(notification.createdAt)}
                                        </p>
                                    </button>
                                    {notification.readAt === null ? (
                                        <Button
                                            type="button"
                                            size="xs"
                                            variant="outline"
                                            onClick={() => void onMarkRead(notification.id)}
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
