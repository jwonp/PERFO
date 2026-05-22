'use client';

import { useState, useEffect } from 'react';
import type { PushNotificationProps } from '@/components/push/push-notification.types';

interface PushPublicKeyResponse {
    publicKey?: string;
}

const fetchVapidPublicKey = async (vapidPublicKey?: string): Promise<string> => {
    if (vapidPublicKey) {
        return vapidPublicKey;
    }

    const response = await fetch('/api/push/public-key', {
        method: 'GET',
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`VAPID key request failed: ${response.status}`);
    }

    const payload = await response.json() as PushPublicKeyResponse;
    return typeof payload.publicKey === 'string' ? payload.publicKey : '';
};

const PushNotification = ({
    vapidPublicKey,
    children,
}: PushNotificationProps) => {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvedVapidPublicKey, setResolvedVapidPublicKey] = useState(vapidPublicKey ?? '');

    useEffect(() => {
        // 브라우저 지원 확인
        const supported =
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;
        setIsSupported(supported);

        if (supported) {
            checkSubscription();
        }
    }, []);

    useEffect(() => {
        setResolvedVapidPublicKey(vapidPublicKey ?? '');

        if (!vapidPublicKey) {
            void (async () => {
                try {
                    const publicKey = await fetchVapidPublicKey(vapidPublicKey);
                    setResolvedVapidPublicKey(publicKey);
                } catch (err) {
                    console.error('VAPID 공개키 조회 실패:', err);
                    setResolvedVapidPublicKey('');
                }
            })();
        }
    }, [vapidPublicKey]);

    // 현재 구독 상태 확인
    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('구독 상태 확인 실패:', err);
        }
    };

    // Service Worker 등록
    const registerServiceWorker = async () => {
        if (!('serviceWorker' in navigator)) return null;

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            return registration;
        } catch (err) {
            console.error('Service Worker 등록 실패:', err);
            return null;
        }
    };

    // Base64 → Uint8Array 변환 (VAPID 키용)
    const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    };

    // 푸시 알림 구독
    const subscribe = async () => {
        const publicKey = resolvedVapidPublicKey || await fetchVapidPublicKey(vapidPublicKey);
        if (!publicKey) {
            setError('VAPID 공개키가 설정되지 않았습니다');
            return;
        }

        if (publicKey !== resolvedVapidPublicKey) {
            setResolvedVapidPublicKey(publicKey);
        }

        const previousSubscribed = isSubscribed;
        setIsLoading(true);
        setError(null);
        setIsSubscribed(true);

        try {
            // 알림 권한 요청
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setIsSubscribed(previousSubscribed);
                setError('알림 권한이 거부되었습니다');
                return;
            }

            // Service Worker 등록
            const registration = await registerServiceWorker();
            if (!registration) {
                setIsSubscribed(previousSubscribed);
                setError('Service Worker 등록 실패');
                return;
            }

            // 푸시 구독
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
            });

            // 서버에 구독 정보 저장
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });
        } catch (err) {
            setIsSubscribed(previousSubscribed);
            console.error('구독 실패:', err);
            setError('푸시 알림 구독에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    // 구독 해제
    const unsubscribe = async () => {
        const previousSubscribed = isSubscribed;
        setIsLoading(true);
        setError(null);
        setIsSubscribed(false);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });
            }

        } catch (err) {
            setIsSubscribed(previousSubscribed);
            console.error('구독 해제 실패:', err);
            setError('구독 해제에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {children({
                isSupported,
                isSubscribed,
                isLoading,
                error,
                subscribe,
                unsubscribe,
            })}
        </>
    );
};

export default PushNotification;
export { PushNotification };
