import { buildNotificationRequestFromTransition, isSafeInternalTargetUrl } from "@/lib/notifications/notification.constants";
import type { NotificationSyncTicket } from "@/lib/notifications/notification.types";
import type { NotificationRepository } from "./notification.repository";

type DeliveryService = {
    deliverNotification: (userId: string, notification: import("@/lib/server/json-store").NotificationRecord) => Promise<void>;
};

type StatusTransitionInput = {
    userId: string;
    scope: import("@/lib/notifications/notification.types").TicketStatusScope;
    ticketId: string;
    ticketName: string;
    targetUrl: string;
    statusKey: import("@/lib/notifications/notification.types").TicketStatusKey;
    previousStatus: string | null;
    nextStatus: string;
};

export const createNotificationSnapshotService = (
    repository: NotificationRepository,
    deliveryService: DeliveryService,
) => {
    const recordTicketStatusTransition = async (input: StatusTransitionInput) => {
        if (!isSafeInternalTargetUrl(input.targetUrl)) {
            return null;
        }

        await repository.upsertSnapshot({
            userId: input.userId,
            scope: input.scope,
            ticketId: input.ticketId,
            ticketName: input.ticketName,
            targetUrl: input.targetUrl,
            statusKey: input.statusKey,
            nextStatus: input.nextStatus,
        });

        const request = buildNotificationRequestFromTransition({
            scope: input.scope,
            ticketId: input.ticketId,
            ticketName: input.ticketName,
            targetUrl: input.targetUrl,
            statusKey: input.statusKey,
            previousStatus: input.previousStatus,
            nextStatus: input.nextStatus,
        });

        if (!request) {
            return null;
        }

        const notification = await repository.createNotificationIfAbsent({
            userId: input.userId,
            scope: input.scope,
            ticketId: input.ticketId,
            request,
        });

        if (!notification) {
            return null;
        }

        await deliveryService.deliverNotification(input.userId, notification);
        return notification.id;
    };

    const bootstrapTicketSnapshots = async (
        userId: string,
        tickets: NotificationSyncTicket[],
    ) => {
        for (const ticket of tickets) {
            if (!isSafeInternalTargetUrl(ticket.targetUrl)) {
                continue;
            }

            for (const candidate of ticket.statuses) {
                await repository.upsertSnapshot({
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

    const syncTicketNotifications = async (
        userId: string,
        tickets: NotificationSyncTicket[],
    ) => {
        const createdNotificationIds: string[] = [];

        for (const ticket of tickets) {
            if (!isSafeInternalTargetUrl(ticket.targetUrl)) {
                continue;
            }

            for (const candidate of ticket.statuses) {
                const previousStatus = await repository.getSnapshotStatus(
                    userId,
                    ticket.scope,
                    ticket.ticketId,
                    candidate.statusKey,
                );

                if (previousStatus === null) {
                    await repository.upsertSnapshot({
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

    return {
        recordTicketStatusTransition,
        bootstrapTicketSnapshots,
        syncTicketNotifications,
    };
};
