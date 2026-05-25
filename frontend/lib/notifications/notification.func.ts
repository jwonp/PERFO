import type {
    NotificationDeliveryRecord,
    NotificationRecord,
    PushSubscriptionRecord,
    TicketStatusSnapshotRecord,
} from "@/lib/server/json-store";
import type { NotificationItem, NotificationListItem, PushSubscriptionData } from "@/lib/notifications/notification.types";

export const nowIso = () => new Date().toISOString();

export const buildSnapshotId = (
    userId: string,
    scope: string,
    ticketId: string,
    statusKey: string,
) => `${userId}:${scope}:${ticketId}:${statusKey}`;

export const toPushSubscriptionData = (
    record: PushSubscriptionRecord,
): PushSubscriptionData => ({
    endpoint: record.endpoint,
    keys: {
        p256dh: record.p256dh,
        auth: record.auth,
    },
});

export const toNotificationItem = (
    notification: NotificationRecord,
): NotificationItem => ({
    id: notification.id,
    type: notification.type as NotificationItem["type"],
    title: notification.title,
    body: notification.body,
    targetUrl: notification.targetUrl,
    sourceType: notification.sourceType as NotificationItem["sourceType"],
    sourceId: notification.sourceId,
    dedupeKey: notification.dedupeKey,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
});

export const toNotificationListItem = (
    notification: NotificationRecord,
    snapshot?: TicketStatusSnapshotRecord,
): NotificationListItem => ({
    ...toNotificationItem(notification),
    ticketName: snapshot?.ticketName ?? notification.title,
});

export const buildDeliveryRecord = (
    input: {
        notificationId: string;
        status: NotificationDeliveryRecord["status"];
        errorCode?: string | null;
        errorMessage?: string | null;
    },
): NotificationDeliveryRecord => ({
    id: crypto.randomUUID(),
    notificationId: input.notificationId,
    channel: "WEB_PUSH",
    status: input.status,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    createdAt: nowIso(),
});
