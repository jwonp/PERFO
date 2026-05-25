import { sendPushNotification } from "@/lib/push/server";
import { toPushSubscriptionData } from "./notification.func";
import type { NotificationRepository } from "./notification.repository";
import type { NotificationRecord } from "@/lib/server/json-store";

export const createNotificationDeliveryService = (
    repository: NotificationRepository,
) => {
    const deliverNotification = async (
        userId: string,
        notification: NotificationRecord,
    ) => {
        const subscriptions = await repository.listActiveSubscriptions(userId);

        if (subscriptions.length === 0) {
            await repository.recordDelivery({
                notificationId: notification.id,
                status: "SKIPPED",
                errorMessage: "No active push subscriptions",
            });
            return;
        }

        for (const subscription of subscriptions) {
            try {
                const success = await sendPushNotification(toPushSubscriptionData(subscription), {
                    title: notification.title,
                    body: notification.body,
                    url: notification.targetUrl,
                    tag: notification.dedupeKey,
                });

                await repository.recordDelivery({
                    notificationId: notification.id,
                    status: success ? "SENT" : "FAILED",
                    errorMessage: success ? null : "Push provider returned failure",
                });

                if (!success) {
                    await repository.markSubscriptionFailed(subscription.endpoint);
                }
            } catch (error) {
                await repository.recordDelivery({
                    notificationId: notification.id,
                    status: "FAILED",
                    errorCode: "PUSH_SEND_ERROR",
                    errorMessage: error instanceof Error ? error.message : "Unknown push error",
                });
                await repository.markSubscriptionFailed(subscription.endpoint);
            }
        }
    };

    return {
        deliverNotification,
    };
};
