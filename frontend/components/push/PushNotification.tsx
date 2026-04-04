'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface PushNotificationProps {
    vapidPublicKey?: string;
}

export function PushNotification({
    vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
}: PushNotificationProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // 현재 구독 상태 확인
    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('구독 상태 확인 실패:', err);
        }
    }

    // Service Worker 등록
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return null;

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            return registration;
        } catch (err) {
            console.error('Service Worker 등록 실패:', err);
            return null;
        }
    }

    // Base64 → Uint8Array 변환 (VAPID 키용)
    function urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    }

    // 푸시 알림 구독
    async function subscribe() {
        if (!vapidPublicKey) {
            setError('VAPID 공개키가 설정되지 않았습니다');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 알림 권한 요청
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setError('알림 권한이 거부되었습니다');
                return;
            }

            // Service Worker 등록
            const registration = await registerServiceWorker();
            if (!registration) {
                setError('Service Worker 등록 실패');
                return;
            }

            // 푸시 구독
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
            });

            // 서버에 구독 정보 저장
            await axios.post('/api/push/subscribe', subscription.toJSON());

            setIsSubscribed(true);
        } catch (err) {
            console.error('구독 실패:', err);
            setError('푸시 알림 구독에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    }

    // 구독 해제
    async function unsubscribe() {
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                await axios.delete('/api/push/subscribe', {
                    data: { endpoint: subscription.endpoint },
                });
            }

            setIsSubscribed(false);
        } catch (err) {
            console.error('구독 해제 실패:', err);
            setError('구독 해제에 실패했습니다');
        } finally {
            setIsLoading(false);
        }
    }

    // 푸시 미지원 환경
    if (!isSupported) {
        return (
            <div className="text-sm text-gray-500">
                이 브라우저는 푸시 알림을 지원하지 않습니다
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={isLoading}
                className={`
          px-4 py-2 rounded-lg font-medium transition-colors
          ${isSubscribed
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
            >
                {isLoading ? '처리 중...' : isSubscribed ? '알림 끄기' : '알림 받기'}
            </button>

            {error && (
                <div className="text-sm text-red-500">{error}</div>
            )}
        </div>
    );
}
