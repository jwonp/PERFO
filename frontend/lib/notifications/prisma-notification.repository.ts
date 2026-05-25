import type { PrismaClient } from "@prisma/client";
import type { NotificationRecord, PushSubscriptionRecord, TicketStatusSnapshotRecord } from "@/lib/server/json-store";
import { buildSnapshotId } from "./notification.func";
import type {
    CreateNotificationInput,
    DeliveryInput,
    NotificationRepository,
    SaveSubscriptionInput,
    UpsertSnapshotInput,
} from "./notification.repository";

const toNotificationRecord = (notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    targetUrl: string;
    sourceType: string;
    sourceId: string;
    dedupeKey: string;
    readAt: Date | null;
    createdAt: Date;
}): NotificationRecord => ({
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    targetUrl: notification.targetUrl,
    sourceType: notification.sourceType,
    sourceId: notification.sourceId,
    dedupeKey: notification.dedupeKey,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
});

const toPushSubscriptionRecord = (subscription: {
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    enabled: boolean;
    lastFailedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): PushSubscriptionRecord => ({
    id: subscription.id,
    userId: subscription.userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    userAgent: subscription.userAgent,
    enabled: subscription.enabled,
    lastFailedAt: subscription.lastFailedAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
});

const toSnapshotRecord = (snapshot: {
    id: string;
    userId: string;
    scope: "reserved" | "issued";
    ticketId: string;
    statusKey: string;
    statusValue: string;
    ticketName: string;
    targetUrl: string;
    createdAt: Date;
    updatedAt: Date;
}): TicketStatusSnapshotRecord => ({
    id: snapshot.id,
    userId: snapshot.userId,
    scope: snapshot.scope,
    ticketId: snapshot.ticketId,
    statusKey: snapshot.statusKey,
    statusValue: snapshot.statusValue,
    ticketName: snapshot.ticketName,
    targetUrl: snapshot.targetUrl,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
});

export class PrismaNotificationRepository implements NotificationRepository {
    constructor(
        private readonly prismaClient: PrismaClient,
        private readonly fallbackRepository: NotificationRepository,
    ) {}

    async listNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
        try {
            const rows = await this.prismaClient.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
            });
            return rows.map(toNotificationRecord);
        } catch (error) {
            console.warn("Notification list query failed, falling back to local store:", error);
            return this.fallbackRepository.listNotificationsByUser(userId);
        }
    }

    async listSnapshotsByUser(userId: string): Promise<TicketStatusSnapshotRecord[]> {
        try {
            const rows = await this.prismaClient.ticketStatusSnapshot.findMany({
                where: { userId },
            });
            return rows.map(toSnapshotRecord);
        } catch (error) {
            console.warn("Notification snapshot query failed, falling back to local store:", error);
            return this.fallbackRepository.listSnapshotsByUser(userId);
        }
    }

    async countUnreadNotifications(userId: string): Promise<number> {
        try {
            return await this.prismaClient.notification.count({
                where: {
                    userId,
                    readAt: null,
                },
            });
        } catch (error) {
            console.warn("Notification count query failed, falling back to local store:", error);
            return this.fallbackRepository.countUnreadNotifications(userId);
        }
    }

    async markNotificationRead(userId: string, notificationId: string): Promise<NotificationRecord | null> {
        try {
            const notification = await this.prismaClient.notification.findFirst({
                where: {
                    id: notificationId,
                    userId,
                },
            });

            if (!notification) {
                return null;
            }

            const updated = notification.readAt
                ? notification
                : await this.prismaClient.notification.update({
                    where: { id: notification.id },
                    data: { readAt: new Date() },
                });

            return toNotificationRecord(updated);
        } catch (error) {
            console.warn("Notification read update failed, falling back to local store:", error);
            return this.fallbackRepository.markNotificationRead(userId, notificationId);
        }
    }

    async markAllNotificationsRead(userId: string): Promise<number> {
        try {
            const result = await this.prismaClient.notification.updateMany({
                where: { userId, readAt: null },
                data: { readAt: new Date() },
            });
            return result.count;
        } catch (error) {
            console.warn("Notification bulk read update failed, falling back to local store:", error);
            return this.fallbackRepository.markAllNotificationsRead(userId);
        }
    }

    async savePushSubscription(input: SaveSubscriptionInput): Promise<PushSubscriptionRecord> {
        try {
            const subscription = await this.prismaClient.pushSubscription.upsert({
                where: { endpoint: input.endpoint },
                create: {
                    userId: input.userId,
                    endpoint: input.endpoint,
                    p256dh: input.keys.p256dh,
                    auth: input.keys.auth,
                    userAgent: input.userAgent,
                    enabled: true,
                },
                update: {
                    userId: input.userId,
                    p256dh: input.keys.p256dh,
                    auth: input.keys.auth,
                    userAgent: input.userAgent,
                    enabled: true,
                },
            });
            return toPushSubscriptionRecord(subscription);
        } catch (error) {
            console.warn("Push subscription upsert failed, falling back to local store:", error);
            return this.fallbackRepository.savePushSubscription(input);
        }
    }

    async disablePushSubscription(userId: string, endpoint: string): Promise<boolean> {
        try {
            const result = await this.prismaClient.pushSubscription.updateMany({
                where: { userId, endpoint },
                data: { enabled: false },
            });
            return result.count > 0;
        } catch (error) {
            console.warn("Push subscription disable failed, falling back to local store:", error);
            return this.fallbackRepository.disablePushSubscription(userId, endpoint);
        }
    }

    async listActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
        try {
            const rows = await this.prismaClient.pushSubscription.findMany({
                where: { userId, enabled: true },
                orderBy: { createdAt: "desc" },
            });
            return rows.map(toPushSubscriptionRecord);
        } catch (error) {
            console.warn("Push subscription query failed, falling back to local store:", error);
            return this.fallbackRepository.listActiveSubscriptions(userId);
        }
    }

    async recordDelivery(input: DeliveryInput): Promise<void> {
        try {
            await this.prismaClient.notificationDelivery.create({
                data: {
                    notificationId: input.notificationId,
                    channel: "WEB_PUSH",
                    status: input.status,
                    errorCode: input.errorCode ?? null,
                    errorMessage: input.errorMessage ?? null,
                },
            });
        } catch (error) {
            console.warn("Notification delivery save failed, falling back to local store:", error);
            await this.fallbackRepository.recordDelivery(input);
        }
    }

    async markSubscriptionFailed(endpoint: string): Promise<void> {
        try {
            await this.prismaClient.pushSubscription.updateMany({
                where: { endpoint },
                data: {
                    enabled: false,
                    lastFailedAt: new Date(),
                },
            });
        } catch (error) {
            console.warn("Push subscription failure mark failed, falling back to local store:", error);
            await this.fallbackRepository.markSubscriptionFailed(endpoint);
        }
    }

    async createNotificationIfAbsent(input: CreateNotificationInput): Promise<NotificationRecord | null> {
        try {
            const duplicate = await this.prismaClient.notification.findUnique({
                where: { dedupeKey: input.request.dedupeKey },
            });

            if (duplicate) {
                return null;
            }

            const created = await this.prismaClient.notification.create({
                data: {
                    userId: input.userId,
                    type: input.request.type,
                    title: input.request.title,
                    body: input.request.body,
                    targetUrl: input.request.targetUrl,
                    sourceType: input.scope,
                    sourceId: input.ticketId,
                    dedupeKey: input.request.dedupeKey,
                },
            });

            return toNotificationRecord(created);
        } catch (error) {
            console.warn("Notification create failed, falling back to local store:", error);
            return this.fallbackRepository.createNotificationIfAbsent(input);
        }
    }

    async upsertSnapshot(input: UpsertSnapshotInput): Promise<void> {
        const id = buildSnapshotId(input.userId, input.scope, input.ticketId, input.statusKey);

        try {
            await this.prismaClient.ticketStatusSnapshot.upsert({
                where: { id },
                create: {
                    id,
                    userId: input.userId,
                    scope: input.scope,
                    ticketId: input.ticketId,
                    statusKey: input.statusKey,
                    statusValue: input.nextStatus,
                    ticketName: input.ticketName,
                    targetUrl: input.targetUrl,
                },
                update: {
                    statusValue: input.nextStatus,
                    ticketName: input.ticketName,
                    targetUrl: input.targetUrl,
                },
            });
        } catch (error) {
            console.warn("Ticket status snapshot upsert failed, falling back to local store:", error);
            await this.fallbackRepository.upsertSnapshot(input);
        }
    }

    async getSnapshotStatus(userId: string, scope: string, ticketId: string, statusKey: string): Promise<string | null> {
        const id = buildSnapshotId(userId, scope, ticketId, statusKey);

        try {
            const snapshot = await this.prismaClient.ticketStatusSnapshot.findUnique({ where: { id } });
            return snapshot?.statusValue ?? null;
        } catch (error) {
            console.warn("Ticket status snapshot lookup failed, falling back to local store:", error);
            return this.fallbackRepository.getSnapshotStatus(userId, scope as "reserved" | "issued", ticketId, statusKey as "ticketingStatus" | "usageStatus" | "issueStatus");
        }
    }
}
