import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/server/prisma";
import {
    readStore,
    updateStore,
    type NotificationDeliveryRecord,
    type NotificationRecord,
    type PushSubscriptionRecord,
    type TicketStatusSnapshotRecord,
} from "@/lib/server/json-store";
import { sendPushNotification } from "@/lib/push/server";
import {
    buildNotificationRequestFromTransition,
    isSafeInternalTargetUrl,
} from "@/lib/notifications/notification.constants";
import type {
    NotificationItem,
    NotificationListItem,
    NotificationSyncTicket,
    PushSubscriptionData,
    TicketStatusKey,
    TicketStatusScope,
} from "@/lib/notifications/notification.types";

type SaveSubscriptionInput = PushSubscriptionData & {
    userId: string;
    userAgent: string | null;
};

type DeliveryInput = {
    notificationId: string;
    status: NotificationDeliveryRecord["status"];
    errorCode?: string | null;
    errorMessage?: string | null;
};

type StatusTransitionInput = {
    userId: string;
    scope: TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statusKey: TicketStatusKey;
    previousStatus: string | null;
    nextStatus: string;
};

const nowIso = () => new Date().toISOString();

const snapshotId = (userId: string, scope: string, ticketId: string, statusKey: string) =>
    `${userId}:${scope}:${ticketId}:${statusKey}`;

const toPushSubscription = (record: PushSubscriptionRecord): PushSubscriptionData => {
    return {
        endpoint: record.endpoint,
        keys: {
            p256dh: record.p256dh,
            auth: record.auth,
        },
    };
};

const toNotificationListItem = (
    notification: NotificationRecord,
    snapshot?: TicketStatusSnapshotRecord,
): NotificationListItem => {
    return {
        id: notification.id,
        type: notification.type as NotificationListItem["type"],
        title: notification.title,
        body: notification.body,
        targetUrl: notification.targetUrl,
        sourceType: notification.sourceType as NotificationListItem["sourceType"],
        sourceId: notification.sourceId,
        dedupeKey: notification.dedupeKey,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        ticketName: snapshot?.ticketName ?? notification.title,
    };
};

const recordDeliveryFallback = async ({
    notificationId,
    status,
    errorCode = null,
    errorMessage = null,
}: DeliveryInput) => {
    await updateStore(async (state) => {
        state.deliveries.unshift({
            id: randomUUID(),
            notificationId,
            channel: "WEB_PUSH",
            status,
            errorCode,
            errorMessage,
            createdAt: nowIso(),
        });
    });
};

const recordDelivery = async (input: DeliveryInput) => {
    if (prisma) {
        await prisma.notificationDelivery.create({
            data: {
                notificationId: input.notificationId,
                channel: "WEB_PUSH",
                status: input.status,
                errorCode: input.errorCode ?? null,
                errorMessage: input.errorMessage ?? null,
            },
        });
        return;
    }

    await recordDeliveryFallback(input);
};

const markSubscriptionFailed = async (endpoint: string) => {
    if (prisma) {
        await prisma.pushSubscription.updateMany({
            where: { endpoint },
            data: {
                enabled: false,
                lastFailedAt: new Date(),
            },
        });
        return;
    }

    await updateStore(async (state) => {
        const subscription = state.subscriptions.find((candidate) => candidate.endpoint === endpoint);
        if (!subscription) {
            return;
        }

        subscription.enabled = false;
        subscription.lastFailedAt = nowIso();
        subscription.updatedAt = subscription.lastFailedAt;
    });
};

const listActiveSubscriptions = async (userId: string): Promise<PushSubscriptionRecord[]> => {
    if (prisma) {
        const rows = await prisma.pushSubscription.findMany({
            where: { userId, enabled: true },
            orderBy: { createdAt: "desc" },
        });

        return rows.map((row) => ({
            id: row.id,
            userId: row.userId,
            endpoint: row.endpoint,
            p256dh: row.p256dh,
            auth: row.auth,
            userAgent: row.userAgent,
            enabled: row.enabled,
            lastFailedAt: row.lastFailedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        }));
    }

    const state = await readStore();
    return state.subscriptions.filter((subscription) => subscription.userId === userId && subscription.enabled);
};

const createNotificationIfNeeded = async ({
    userId,
    scope,
    ticketId,
    ticketName,
    targetUrl,
    statusKey,
    previousStatus,
    nextStatus,
}: StatusTransitionInput): Promise<NotificationRecord | null> => {
    const request = buildNotificationRequestFromTransition({
        scope,
        ticketId,
        ticketName,
        targetUrl,
        statusKey,
        previousStatus,
        nextStatus,
    });

    if (!request) {
        return null;
    }

    if (prisma) {
        const duplicate = await prisma.notification.findUnique({
            where: { dedupeKey: request.dedupeKey },
        });

        if (duplicate) {
            return null;
        }

        const created = await prisma.notification.create({
            data: {
                userId,
                type: request.type,
                title: request.title,
                body: request.body,
                targetUrl: request.targetUrl,
                sourceType: scope,
                sourceId: ticketId,
                dedupeKey: request.dedupeKey,
            },
        });

        return {
            id: created.id,
            userId: created.userId,
            type: created.type,
            title: created.title,
            body: created.body,
            targetUrl: created.targetUrl,
            sourceType: created.sourceType,
            sourceId: created.sourceId,
            dedupeKey: created.dedupeKey,
            readAt: created.readAt?.toISOString() ?? null,
            createdAt: created.createdAt.toISOString(),
        };
    }

    return updateStore(async (state) => {
        const duplicate = state.notifications.find((notification) => {
            return notification.userId === userId && notification.dedupeKey === request.dedupeKey;
        });

        if (duplicate) {
            return null;
        }

        const created: NotificationRecord = {
            id: randomUUID(),
            userId,
            type: request.type,
            title: request.title,
            body: request.body,
            targetUrl: request.targetUrl,
            sourceType: scope,
            sourceId: ticketId,
            dedupeKey: request.dedupeKey,
            readAt: null,
            createdAt: nowIso(),
        };

        state.notifications.unshift(created);
        return created;
    });
};

const upsertSnapshot = async ({
    userId,
    scope,
    ticketId,
    ticketName,
    targetUrl,
    statusKey,
    nextStatus,
}: Omit<StatusTransitionInput, "previousStatus">) => {
    const id = snapshotId(userId, scope, ticketId, statusKey);

    if (prisma) {
        await prisma.ticketStatusSnapshot.upsert({
            where: { id },
            create: {
                id,
                userId,
                scope,
                ticketId,
                statusKey,
                statusValue: nextStatus,
                ticketName,
                targetUrl,
            },
            update: {
                statusValue: nextStatus,
                ticketName,
                targetUrl,
            },
        });
        return;
    }

    await updateStore(async (state) => {
        const existingSnapshot = state.snapshots.find((snapshot) => snapshot.id === id);

        if (!existingSnapshot) {
            state.snapshots.unshift({
                id,
                userId,
                scope,
                ticketId,
                statusKey,
                statusValue: nextStatus,
                ticketName,
                targetUrl,
                createdAt: nowIso(),
                updatedAt: nowIso(),
            });
            return;
        }

        existingSnapshot.statusValue = nextStatus;
        existingSnapshot.ticketName = ticketName;
        existingSnapshot.targetUrl = targetUrl;
        existingSnapshot.updatedAt = nowIso();
    });
};

const getSnapshotStatus = async (userId: string, scope: string, ticketId: string, statusKey: string) => {
    const id = snapshotId(userId, scope, ticketId, statusKey);

    if (prisma) {
        const snapshot = await prisma.ticketStatusSnapshot.findUnique({ where: { id } });
        return snapshot?.statusValue ?? null;
    }

    const state = await readStore();
    return state.snapshots.find((snapshot) => snapshot.id === id)?.statusValue ?? null;
};

const deliverNotification = async (userId: string, notification: NotificationRecord) => {
    const subscriptions = await listActiveSubscriptions(userId);

    if (subscriptions.length === 0) {
        await recordDelivery({
            notificationId: notification.id,
            status: "SKIPPED",
            errorMessage: "No active push subscriptions",
        });
        return;
    }

    for (const subscription of subscriptions) {
        try {
            const success = await sendPushNotification(toPushSubscription(subscription), {
                title: notification.title,
                body: notification.body,
                url: notification.targetUrl,
                tag: notification.dedupeKey,
            });

            await recordDelivery({
                notificationId: notification.id,
                status: success ? "SENT" : "FAILED",
                errorMessage: success ? null : "Push provider returned failure",
            });

            if (!success) {
                await markSubscriptionFailed(subscription.endpoint);
            }
        } catch (error) {
            await recordDelivery({
                notificationId: notification.id,
                status: "FAILED",
                errorCode: "PUSH_SEND_ERROR",
                errorMessage: error instanceof Error ? error.message : "Unknown push error",
            });
            await markSubscriptionFailed(subscription.endpoint);
        }
    }
};

export const listNotifications = async (userId: string): Promise<NotificationListItem[]> => {
    if (prisma) {
        const [notifications, snapshots] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
            }),
            prisma.ticketStatusSnapshot.findMany({
                where: { userId },
            }),
        ]);

        return notifications.map((notification) => {
            const snapshot = snapshots.find((candidate) => {
                return candidate.scope === notification.sourceType && candidate.ticketId === notification.sourceId;
            });

            return {
                id: notification.id,
                type: notification.type as NotificationListItem["type"],
                title: notification.title,
                body: notification.body,
                targetUrl: notification.targetUrl,
                sourceType: notification.sourceType as NotificationListItem["sourceType"],
                sourceId: notification.sourceId,
                dedupeKey: notification.dedupeKey,
                readAt: notification.readAt?.toISOString() ?? null,
                createdAt: notification.createdAt.toISOString(),
                ticketName: snapshot?.ticketName ?? notification.title,
            };
        });
    }

    const state = await readStore();

    return state.notifications
        .filter((notification) => notification.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((notification) => {
            const snapshot = state.snapshots.find((candidate) => {
                return (
                    candidate.userId === userId &&
                    candidate.scope === notification.sourceType &&
                    candidate.ticketId === notification.sourceId
                );
            });

            return toNotificationListItem(notification, snapshot);
        });
};

export const getUnreadNotificationCount = async (userId: string) => {
    if (prisma) {
        return prisma.notification.count({
            where: {
                userId,
                readAt: null,
            },
        });
    }

    const state = await readStore();
    return state.notifications.filter((notification) => notification.userId === userId && notification.readAt === null).length;
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
    if (prisma) {
        const notification = await prisma.notification.findFirst({
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
            : await prisma.notification.update({
                where: { id: notification.id },
                data: { readAt: new Date() },
            });

        return {
            id: updated.id,
            type: updated.type as NotificationItem["type"],
            title: updated.title,
            body: updated.body,
            targetUrl: updated.targetUrl,
            sourceType: updated.sourceType as NotificationItem["sourceType"],
            sourceId: updated.sourceId,
            dedupeKey: updated.dedupeKey,
            readAt: updated.readAt?.toISOString() ?? null,
            createdAt: updated.createdAt.toISOString(),
        } satisfies NotificationItem;
    }

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

        return notification as NotificationItem;
    });
};

export const markAllNotificationsRead = async (userId: string) => {
    if (prisma) {
        const result = await prisma.notification.updateMany({
            where: {
                userId,
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });
        return result.count;
    }

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
};

export const savePushSubscription = async ({
    userId,
    endpoint,
    keys,
    userAgent,
}: SaveSubscriptionInput) => {
    if (prisma) {
        try {
            return await prisma.pushSubscription.upsert({
                where: { endpoint },
                create: {
                    userId,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent,
                    enabled: true,
                },
                update: {
                    userId,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent,
                    enabled: true,
                },
            });
        } catch (error) {
            console.warn("Push subscription upsert failed, falling back to local store:", error);
        }
    }

    return updateStore(async (state) => {
        const timestamp = nowIso();
        const existing = state.subscriptions.find((subscription) => subscription.endpoint === endpoint);

        if (existing) {
            existing.userId = userId;
            existing.p256dh = keys.p256dh;
            existing.auth = keys.auth;
            existing.userAgent = userAgent;
            existing.enabled = true;
            existing.updatedAt = timestamp;
            return existing;
        }

        const created: PushSubscriptionRecord = {
            id: randomUUID(),
            userId,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent,
            enabled: true,
            lastFailedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        state.subscriptions.unshift(created);
        return created;
    });
};

export const disablePushSubscription = async (userId: string, endpoint: string) => {
    if (prisma) {
        try {
            const result = await prisma.pushSubscription.updateMany({
                where: {
                    userId,
                    endpoint,
                },
                data: {
                    enabled: false,
                },
            });
            return result.count > 0;
        } catch (error) {
            console.warn("Push subscription disable failed, falling back to local store:", error);
        }
    }

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
};

export const recordTicketStatusTransition = async (input: StatusTransitionInput) => {
    if (!isSafeInternalTargetUrl(input.targetUrl)) {
        return null;
    }

    await upsertSnapshot({
        userId: input.userId,
        scope: input.scope,
        ticketId: input.ticketId,
        ticketName: input.ticketName,
        targetUrl: input.targetUrl,
        statusKey: input.statusKey,
        nextStatus: input.nextStatus,
    });

    const notification = await createNotificationIfNeeded(input);
    if (!notification) {
        return null;
    }

    await deliverNotification(input.userId, notification);
    return notification.id;
};

export const bootstrapTicketSnapshots = async (userId: string, tickets: NotificationSyncTicket[]) => {
    for (const ticket of tickets) {
        if (!isSafeInternalTargetUrl(ticket.targetUrl)) {
            continue;
        }

        for (const candidate of ticket.statuses) {
            await upsertSnapshot({
                userId,
                scope: ticket.scope,
                ticketId: ticket.ticketId,
                ticketName: ticket.ticketName,
                targetUrl: ticket.targetUrl,
                statusKey: candidate.statusKey,
                nextStatus: candidate.statusValue,
            });
        }
    }
};

export const syncTicketNotifications = async (userId: string, tickets: NotificationSyncTicket[]) => {
    const createdNotificationIds: string[] = [];

    for (const ticket of tickets) {
        if (!isSafeInternalTargetUrl(ticket.targetUrl)) {
            continue;
        }

        for (const candidate of ticket.statuses) {
            const previousStatus = await getSnapshotStatus(userId, ticket.scope, ticket.ticketId, candidate.statusKey);

            if (previousStatus === null) {
                await upsertSnapshot({
                    userId,
                    scope: ticket.scope,
                    ticketId: ticket.ticketId,
                    ticketName: ticket.ticketName,
                    targetUrl: ticket.targetUrl,
                    statusKey: candidate.statusKey,
                    nextStatus: candidate.statusValue,
                });
                continue;
            }

            const notificationId = await recordTicketStatusTransition({
                userId,
                scope: ticket.scope,
                ticketId: ticket.ticketId,
                ticketName: ticket.ticketName,
                targetUrl: ticket.targetUrl,
                statusKey: candidate.statusKey,
                previousStatus,
                nextStatus: candidate.statusValue,
            });

            if (notificationId) {
                createdNotificationIds.push(notificationId);
            }
        }
    }

    return createdNotificationIds;
};
