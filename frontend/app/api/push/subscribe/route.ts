import { NextRequest, NextResponse } from 'next/server';

// 임시 메모리 저장소 (프로덕션에서는 DB 사용)
// TODO: Prisma로 교체
const subscriptions = new Map<string, PushSubscriptionJSON>();

export const POST = async (request: NextRequest) => {
    try {
        const subscription = await request.json();

        // 구독 저장 (endpoint를 키로 사용)
        subscriptions.set(subscription.endpoint, subscription);

        console.log('푸시 구독 저장:', subscription.endpoint);

        return NextResponse.json({
            success: true,
            message: '푸시 알림 구독 완료'
        });
    } catch (error) {
        console.error('구독 저장 실패:', error);
        return NextResponse.json(
            { success: false, error: '구독 저장 실패' },
            { status: 500 }
        );
    }
};

export const DELETE = async (request: NextRequest) => {
    try {
        const { endpoint } = await request.json();

        subscriptions.delete(endpoint);

        return NextResponse.json({
            success: true,
            message: '푸시 알림 구독 해제 완료'
        });
    } catch (error) {
        console.error('구독 해제 실패:', error);
        return NextResponse.json(
            { success: false, error: '구독 해제 실패' },
            { status: 500 }
        );
    }
};

// 현재 구독 목록 조회 (디버깅용)
export const GET = async () => {
    return NextResponse.json({
        count: subscriptions.size,
        endpoints: Array.from(subscriptions.keys()),
    });
};
