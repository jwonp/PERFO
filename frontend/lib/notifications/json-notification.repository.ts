import {
    readStore,
    updateStore,
    type NotificationRecord,
    type PushSubscriptionRecord,
    type TicketStatusSnapshotRecord,
} from "@/lib/server/json-store";
import { buildDeliveryRecord, buildSnapshotId, nowIso } from "./notification.func";
import type {
    CreateNotificationInput,
    DeliveryInput,
    NotificationRepository,
    SaveSubscriptionInput,
    UpsertSnapshotInput,
} from "./notification.repository";

export class JsonNotificationRepository implements NotificationRepository {
    async listNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
        const state = await readStore();
        return state.notifications
            .filter((notification) => notification.userId === userId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }

    async listSnapshotsByUser(userId: string): Promise<TicketStatusSnapshotRecord[]> {
        const state = await readStore();
        return state.snapshots.filter((snapshot) => snapshot.userId === userId);
    }

    async countUnreadNotifications(userId: string): Promise<number> {
        const state = await readStore();
        return state.notifications.filter((notification) => notification.userId === userId && notification.readAt === null).length;
    }

    async markNotificationRead(userId: string, notificationId: string): Promise<NotificationRecord | null> {
        return updateStore(async (state) => {
            const notification = state.notifications.find((candidate) => {
                return candidate.id === notificationId && candidate.userId === userId;
            });

            if (!notification) {
                return null;
            }

            if (!notification.readAt) {
                notification.readAt = nowIso();
            }

            return { ...notification };
        });
    }

    async markAllNotificationsRead(userId: string): Promise<number> {
        return updateStore(async (state) => {
            const timestamp = nowIso();
            let updated = 0;

            state.notifications.forEach((notification) => {
                if (notification.userId === userId && notification.readAt === null) {
                    notification.readAt = timestamp;
                    updated += 1;
                }
            });

            return updated;
        });
    }

    async savePushSubscription(input: SaveSubscriptionInput): Promise<PushSubscriptionRecord> {
        return updateStore(async (state) => {
            const timestamp = nowIso();
            const existing = state.subscriptions.find((subscription) => subscription.endpoint === input.endpoint);

            if (existing) {
                existing.userId = input.userId;
                existing.p256dh = input.keys.p256dh;
                existing.auth = input.keys.auth;
                existing.userAgent = input.userAgent;
                existing.enabled = true;
                existing.updatedAt = timestamp;
                return { ...existing };
            }

            const created: PushSubscriptionRecord = {
                id: crypto.randomUUID(),
                userId: input.userId,
                endpoint: input.endpoint,
                p256dh: input.keys.p256dh,
                auth: input.keys.auth,
                userAgent: input.userAgent,
                enabled: true,
                lastFailedAt: null,
                createdAt: timestamp,
                updatedAt: timestamp,
            };

            state.subscriptions.unshift(created);
            return created;
        });
    }

    async disablePushSubscription(userId: string, endpoint: string): Promise<boolean> {
        return updateStore(async (state) => {
            const subscription = state.subscriptions.find((candidate) => {
                return candidate.userId === userId && candidate.endpoint === endpoint;
            });

            if (!subscription) {
                return false;
            }

            subscription.enabled = false;
            subscription.updatedAt = nowIso();
            return true;
        });
    }

    async listActiveSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
        const state = await readStore();
        return state.subscriptions.filter((subscription) => subscription.userId === userId && subscription.enabled);
    }

    async recordDelivery(input: DeliveryInput): Promise<void> {
        await updateStore(async (state) => {
            state.deliveries.unshift(buildDeliveryRecord(input));
        });
    }

    async markSubscriptionFailed(endpoint: string): Promise<void> {
        await updateStore(async (state) => {
            const subscription = state.subscriptions.find((candidate) => candidate.endpoint === endpoint);
            if (!subscription) {
                return;
            }

            subscription.enabled = false;
            subscription.lastFailedAt = nowIso();
            subscription.updatedAt = subscription.lastFailedAt;
        });
    }

    async createNotificationIfAbsent(input: CreateNotificationInput): Promise<NotificationRecord | null> {
        return updateStore(async (state) => {
            const duplicate = state.notifications.find((notification) => {
                return notification.userId === input.userId && notification.dedupeKey === input.request.dedupeKey;
            });

            if (duplicate) {
                return null;
            }

            const created: NotificationRecord = {
                id: crypto.randomUUID(),
                userId: input.userId,
                type: input.request.type,
                title: input.request.title,
                body: input.request.body,
                targetUrl: input.request.targetUrl,
                sourceType: input.scope,
                sourceId: input.ticketId,
                dedupeKey: input.request.dedupeKey,
                readAt: null,
                createdAt: nowIso(),
            };

            state.notifications.unshift(created);
            return created;
        });
    }

    async upsertSnapshot(input: UpsertSnapshotInput): Promise<void> {
        await updateStore(async (state) => {
            const id = buildSnapshotId(input.userId, input.scope, input.ticketId, input.statusKey);
            const existingSnapshot = state.snapshots.find((snapshot) => snapshot.id === id);
            const timestamp = nowIso();

            if (!existingSnapshot) {
                state.snapshots.unshift({
                    id,
                    userId: input.userId,
                    scope: input.scope,
                    ticketId: input.ticketId,
                    statusKey: input.statusKey,
                    statusValue: input.nextStatus,
                    ticketName: input.ticketName,
                    targetUrl: input.targetUrl,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                });
                return;
            }

            existingSnapshot.statusValue = input.nextStatus;
            existingSnapshot.ticketName = input.ticketName;
            existingSnapshot.targetUrl = input.targetUrl;
            existingSnapshot.updatedAt = timestamp;
        });
    }

    async getSnapshotStatus(userId: string, scope: string, ticketId: string, statusKey: string): Promise<string | null> {
        const state = await readStore();
        const id = buildSnapshotId(userId, scope, ticketId, statusKey);
        return state.snapshots.find((snapshot) => snapshot.id === id)?.statusValue ?? null;
    }
}
