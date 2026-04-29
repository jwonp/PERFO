export interface PushNotificationProps {
    vapidPublicKey?: string;
    children: (state: {
        isSupported: boolean;
        isSubscribed: boolean;
        isLoading: boolean;
        error: string | null;
        subscribe: () => Promise<void>;
        unsubscribe: () => Promise<void>;
    }) => React.ReactNode;
}
