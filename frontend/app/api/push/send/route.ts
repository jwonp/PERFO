import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push/server';
import type { PushPayload, PushSubscriptionData } from '@/lib/push/config';

export const POST = async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { subscription, payload } = body as {
            subscription: PushSubscriptionData;
            payload: PushPayload;
        };

        if (!subscription || !payload) {
            return NextResponse.json(
                { success: false, error: 'subscription과 payload가 필요합니다' },
                { status: 400 }
            );
        }

        const success = await sendPushNotification(subscription, payload);

        return NextResponse.json({ success });
    } catch (error) {
        console.error('푸시 발송 실패:', error);
        return NextResponse.json(
            { success: false, error: '푸시 발송 실패' },
            { status: 500 }
        );
    }
};
