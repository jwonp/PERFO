import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStoreForTests } from "@/lib/server/json-store";
import { JsonNotificationRepository } from "./json-notification.repository";

describe("JsonNotificationRepository", () => {
    const repository = new JsonNotificationRepository();

    beforeEach(async () => {
        await resetStoreForTests();
    });

    afterEach(async () => {
        await resetStoreForTests();
    });

    it("notification dedupe와 list 조회를 처리한다", async () => {
        const created = await repository.createNotificationIfAbsent({
            userId: "user-1",
            scope: "reserved",
            ticketId: "ticket-1",
            request: {
                type: "TICKET_SUCCESS",
                title: "티켓 예약 완료",
                body: "완료되었습니다.",
                targetUrl: "/ko/reserved/ticket-1",
                dedupeKey: "reserved:ticket-1:ticketingStatus:SUCCESS",
            },
        });
        const duplicate = await repository.createNotificationIfAbsent({
            userId: "user-1",
            scope: "reserved",
            ticketId: "ticket-1",
            request: {
                type: "TICKET_SUCCESS",
                title: "티켓 예약 완료",
                body: "완료되었습니다.",
                targetUrl: "/ko/reserved/ticket-1",
                dedupeKey: "reserved:ticket-1:ticketingStatus:SUCCESS",
            },
        });

        expect(created).not.toBeNull();
        expect(duplicate).toBeNull();
        expect(await repository.listNotificationsByUser("user-1")).toHaveLength(1);
    });

    it("snapshot upsert와 status 조회를 처리한다", async () => {
        await repository.upsertSnapshot({
            userId: "user-1",
            scope: "reserved",
            ticketId: "ticket-1",
            ticketName: "PERFO Summer Festival",
            targetUrl: "/ko/reserved/ticket-1",
            statusKey: "usageStatus",
            nextStatus: "WAITING",
        });
        await repository.upsertSnapshot({
            userId: "user-1",
            scope: "reserved",
            ticketId: "ticket-1",
            ticketName: "PERFO Summer Festival",
            targetUrl: "/ko/reserved/ticket-1",
            statusKey: "usageStatus",
            nextStatus: "MY_TURN",
        });

        expect(
            await repository.getSnapshotStatus("user-1", "reserved", "ticket-1", "usageStatus"),
        ).toBe("MY_TURN");
        expect(await repository.listSnapshotsByUser("user-1")).toHaveLength(1);
    });

    it("push subscription 저장과 비활성화를 처리한다", async () => {
        await repository.savePushSubscription({
            userId: "user-1",
            endpoint: "https://push.example/subscription",
            keys: {
                p256dh: "key-p256dh",
                auth: "key-auth",
            },
            userAgent: "vitest",
        });

        expect(await repository.listActiveSubscriptions("user-1")).toHaveLength(1);
        expect(
            await repository.disablePushSubscription("user-1", "https://push.example/subscription"),
        ).toBe(true);
        expect(await repository.listActiveSubscriptions("user-1")).toHaveLength(0);
    });
});
