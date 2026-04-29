// VAPID 키 설정
// 새 키 생성: npx web-push generate-vapid-keys

export const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: 'mailto:admin@perfo.app', // 연락처 이메일
};

export type { PushPayload, PushSubscriptionData } from './push.types';
