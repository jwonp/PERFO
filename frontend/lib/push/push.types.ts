export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
}

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}
