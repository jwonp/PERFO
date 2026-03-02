// VAPID 키 설정
// 새 키 생성: npx web-push generate-vapid-keys

export const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: 'mailto:admin@perfo.app', // 연락처 이메일
};

// 푸시 알림 페이로드 타입
export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
}

// 푸시 구독 타입 (DB 저장용)
export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}
