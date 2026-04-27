import webPush from 'web-push';
import { vapidKeys, PushPayload, PushSubscriptionData } from './config';

// VAPID 설정 초기화
if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webPush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

/**
 * 푸시 알림 발송
 * @param subscription 구독 정보
 * @param payload 알림 내용
 */
export const sendPushNotification = async (
    subscription: PushSubscriptionData,
    payload: PushPayload
): Promise<boolean> => {
    try {
        await webPush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            },
            JSON.stringify(payload)
        );
        return true;
    } catch (error) {
        console.error('푸시 발송 실패:', error);
        return false;
    }
};

/**
 * 여러 구독자에게 푸시 발송
 * @param subscriptions 구독 목록
 * @param payload 알림 내용
 */
export const sendPushToMany = async (
    subscriptions: PushSubscriptionData[],
    payload: PushPayload
): Promise<{ success: number; failed: number }> => {
    const results = await Promise.allSettled(
        subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const success = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - success;

    return { success, failed };
};
