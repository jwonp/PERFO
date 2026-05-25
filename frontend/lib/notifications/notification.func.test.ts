import { describe, expect, it } from "vitest";
import { buildSnapshotId, toNotificationListItem, toPushSubscriptionData } from "./notification.func";

describe("notification.func", () => {
    it("snapshot id를 사용자/범위/티켓/상태키 조합으로 만든다", () => {
        expect(buildSnapshotId("user-1", "reserved", "ticket-1", "usageStatus"))
            .toBe("user-1:reserved:ticket-1:usageStatus");
    });

    it("push subscription record를 web push payload 형식으로 변환한다", () => {
        expect(toPushSubscriptionData({
            id: "sub-1",
            userId: "user-1",
            endpoint: "https://push.example/subscription",
            p256dh: "p256dh-key",
            auth: "auth-key",
            userAgent: "vitest",
            enabled: true,
            lastFailedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        })).toEqual({
            endpoint: "https://push.example/subscription",
            keys: {
                p256dh: "p256dh-key",
                auth: "auth-key",
            },
        });
    });

    it("list item은 snapshot ticket name을 우선 사용한다", () => {
        const item = toNotificationListItem(
            {
                id: "noti-1",
                userId: "user-1",
                type: "TICKET_SUCCESS",
                title: "티켓 예약 완료",
                body: "완료되었습니다.",
                targetUrl: "/ko/reserved/ticket-1",
                sourceType: "reserved",
                sourceId: "ticket-1",
                dedupeKey: "reserved:ticket-1:ticketingStatus:SUCCESS",
                readAt: null,
                createdAt: "2026-01-01T00:00:00.000Z",
            },
            {
                id: "user-1:reserved:ticket-1:ticketingStatus",
                userId: "user-1",
                scope: "reserved",
                ticketId: "ticket-1",
                statusKey: "ticketingStatus",
                statusValue: "SUCCESS",
                ticketName: "PERFO Summer Festival",
                targetUrl: "/ko/reserved/ticket-1",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
            },
        );

        expect(item.ticketName).toBe("PERFO Summer Festival");
        expect(item.type).toBe("TICKET_SUCCESS");
    });
});
