// PERFO Service Worker - 푸시 알림 처리

// 푸시 이벤트 수신
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || '새로운 알림이 있습니다',
        icon: data.icon || '/Icons/icon-192.png',
        badge: '/Icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'perfo-notification',
        renotify: true,
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'PERFO', options)
    );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열린 창이 있으면 포커스
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // 없으면 새 창 열기
            return clients.openWindow(url);
        })
    );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});
