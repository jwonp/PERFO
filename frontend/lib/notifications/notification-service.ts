import { toNotificationItem, toNotificationListItem } from "./notification.func";
import { createNotificationDeliveryService } from "./notification-delivery.service";
import { getNotificationRepository } from "./notification.repository";
import { createNotificationSnapshotService } from "./notification-snapshot.service";
import { createNotificationSubscriptionService } from "./notification-subscription.service";

const repository = getNotificationRepository();
const deliveryService = createNotificationDeliveryService(repository);
const snapshotService = createNotificationSnapshotService(repository, deliveryService);
const subscriptionService = createNotificationSubscriptionService(repository);

export const listNotifications = async (userId: string) => {
    const [notifications, snapshots] = await Promise.all([
        repository.listNotificationsByUser(userId),
        repository.listSnapshotsByUser(userId),
    ]);

    return notifications.map((notification) => {
        const snapshot = snapshots.find((candidate) => {
            return (
                candidate.userId === userId &&
                candidate.scope === notification.sourceType &&
                candidate.ticketId === notification.sourceId
            );
        });

        return toNotificationListItem(notification, snapshot);
    });
};

export const getUnreadNotificationCount = async (userId: string) =>
    repository.countUnreadNotifications(userId);

export const markNotificationRead = async (userId: string, notificationId: string) => {
    const notification = await repository.markNotificationRead(userId, notificationId);
    return notification ? toNotificationItem(notification) : null;
};

export const markAllNotificationsRead = async (userId: string) =>
    repository.markAllNotificationsRead(userId);

export const savePushSubscription = subscriptionService.savePushSubscription;

export const disablePushSubscription = subscriptionService.disablePushSubscription;

export const recordTicketStatusTransition = snapshotService.recordTicketStatusTransition;

export const bootstrapTicketSnapshots = snapshotService.bootstrapTicketSnapshots;

export const syncTicketNotifications = snapshotService.syncTicketNotifications;
