import type { NotificationRepository, SaveSubscriptionInput } from "./notification.repository";

export const createNotificationSubscriptionService = (
    repository: NotificationRepository,
) => ({
    savePushSubscription: (input: SaveSubscriptionInput) => repository.savePushSubscription(input),
    disablePushSubscription: (userId: string, endpoint: string) => repository.disablePushSubscription(userId, endpoint),
});
