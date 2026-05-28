import { prisma } from "@/lib/server/prisma";
import type {
    NotificationDeliveryRecord,
    NotificationRecord,
    PushSubscriptionRecord,
    TicketStatusSnapshotRecord,
} from "@/lib/server/json-store";
import type { NotificationRequested, PushSubscriptionData, TicketStatusKey, TicketStatusScope } from "@/lib/notifications/notification.types";
import { JsonNotificationRepository } from "./json-notification.repository";
import { PrismaNotificationRepository } from "./prisma-notification.repository";

export type SaveSubscriptionInput = PushSubscriptionData & {
    userId: string;
    userAgent: string | null;
};

export type DeliveryInput = {
    notificationId: string;
    status: NotificationDeliveryRecord["status"];
    errorCode?: string | null;
    errorMessage?: string | null;
};

export type CreateNotificationInput = {
    userId: string;
    scope: TicketStatusScope;
    ticketId: string;
    request: NotificationRequested;
};

export type UpsertSnapshotInput = {
    userId: string;
    scope: TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statusKey: TicketStatusKey;
    nextStatus: string;
};

export interface NotificationRepository {
    listNotificationsByUser(userId: string): Promise<NotificationRecord[]>;
    listSnapshotsByUser(userId: string): Promise<TicketStatusSnapshotRecord[]>;
    countUnreadNotifications(userId: string): Promise<number>;
    markNotificationRead(userId: string, notificationId: string): Promise<NotificationRecord | null>;
    markAllNotificationsRead(userId: string): Promise<number>;
    savePushSubscription(input: SaveSubscriptionInput): Promise<PushSubscriptionRecord>;
    disablePushSubscription(userId: string, endpoint: string): Promise<boolean>;
    listActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]>;
    recordDelivery(input: DeliveryInput): Promise<void>;
    markSubscriptionFailed(endpoint: string): Promise<void>;
    createNotificationIfAbsent(input: CreateNotificationInput): Promise<NotificationRecord | null>;
    upsertSnapshot(input: UpsertSnapshotInput): Promise<void>;
    getSnapshotStatus(
        userId: string,
        scope: TicketStatusScope,
        ticketId: string,
        statusKey: TicketStatusKey,
    ): Promise<string | null>;
}

let cachedRepository: NotificationRepository | null = null;

export const getNotificationRepository = (): NotificationRepository => {
    if (cachedRepository) {
        return cachedRepository;
    }

    const fallbackRepository = new JsonNotificationRepository();
    cachedRepository = process.env.NOTIFICATION_STORE === "prisma" && prisma
        ? new PrismaNotificationRepository(prisma, fallbackRepository)
        : fallbackRepository;

    return cachedRepository;
};
