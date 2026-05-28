import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/app/generated/prisma/client";
import type { NotificationRepository } from "./notification.repository";
import { PrismaNotificationRepository } from "./prisma-notification.repository";

const createFallbackRepository = (): NotificationRepository => ({
    listNotificationsByUser: vi.fn(async () => []),
    listSnapshotsByUser: vi.fn(async () => []),
    countUnreadNotifications: vi.fn(async () => 3),
    markNotificationRead: vi.fn(async () => null),
    markAllNotificationsRead: vi.fn(async () => 0),
    savePushSubscription: vi.fn(),
    disablePushSubscription: vi.fn(async () => false),
    listActiveSubscriptions: vi.fn(async () => []),
    recordDelivery: vi.fn(async () => undefined),
    markSubscriptionFailed: vi.fn(async () => undefined),
    createNotificationIfAbsent: vi.fn(async () => null),
    upsertSnapshot: vi.fn(async () => undefined),
    getSnapshotStatus: vi.fn(async () => null),
});

describe("PrismaNotificationRepository", () => {
    it("Prisma notification table이 없으면 로그 없이 local store count로 fallback한다", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const fallbackRepository = createFallbackRepository();
        const repository = new PrismaNotificationRepository(
            {
                notification: {
                    count: vi.fn(async () => {
                        throw { code: "P2021" };
                    }),
                },
            } as unknown as PrismaClient,
            fallbackRepository,
        );

        await expect(repository.countUnreadNotifications("user-1")).resolves.toBe(3);

        expect(fallbackRepository.countUnreadNotifications).toHaveBeenCalledWith("user-1");
        expect(warnSpy).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });
});
