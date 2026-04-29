import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, disablePushSubscription } from "@/lib/notifications/notification-service";
import { getRequiredSessionUser } from "@/lib/server/session";
import type { PushSubscriptionData } from "@/lib/notifications/notification.types";

const isValidSubscription = (value: unknown): value is PushSubscriptionData => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as PushSubscriptionData;
    return Boolean(
        candidate.endpoint &&
        candidate.keys?.p256dh &&
        candidate.keys?.auth,
    );
};

export const POST = async (request: NextRequest) => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const subscription = await request.json();
        if (!isValidSubscription(subscription)) {
            return NextResponse.json(
                { success: false, error: "유효한 구독 정보가 필요합니다" },
                { status: 400 },
            );
        }

        await savePushSubscription({
            userId: user.id,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: request.headers.get("user-agent"),
        });

        return NextResponse.json({
            success: true,
            message: "푸시 알림 구독 완료",
        });
    } catch (error) {
        console.error("구독 저장 실패:", error);
        return NextResponse.json(
            { success: false, error: "구독 저장 실패" },
            { status: 500 },
        );
    }
};

export const DELETE = async (request: NextRequest) => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = (await request.json()) as { endpoint?: string };
        if (!body.endpoint) {
            return NextResponse.json(
                { success: false, error: "endpoint가 필요합니다" },
                { status: 400 },
            );
        }

        await disablePushSubscription(user.id, body.endpoint);

        return NextResponse.json({
            success: true,
            message: "푸시 알림 구독 해제 완료",
        });
    } catch (error) {
        console.error("구독 해제 실패:", error);
        return NextResponse.json(
            { success: false, error: "구독 해제 실패" },
            { status: 500 },
        );
    }
};
