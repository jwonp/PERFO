import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
    getServerSessionMock: vi.fn(),
}));
const { savePushSubscriptionMock, disablePushSubscriptionMock } = vi.hoisted(() => ({
    savePushSubscriptionMock: vi.fn(),
    disablePushSubscriptionMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
    getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth.config", () => ({
    authOptions: {},
}));

vi.mock("@/lib/notifications/notification-service", () => ({
    savePushSubscription: savePushSubscriptionMock,
    disablePushSubscription: disablePushSubscriptionMock,
}));

const importRoute = async () => {
    vi.resetModules();
    return import("../route");
};

describe("/api/push/subscribe route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        savePushSubscriptionMock.mockReset();
        disablePushSubscriptionMock.mockReset();
        vi.resetModules();
    });

    it("POST는 세션이 없으면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);

        const { POST } = await importRoute();
        const response = await POST(new Request("http://localhost/api/push/subscribe", { method: "POST" }));

        expect(savePushSubscriptionMock).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            success: false,
            error: "Unauthorized",
        });
    });

    it("DELETE는 endpoint가 없으면 400을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });

        const { DELETE } = await importRoute();
        const response = await DELETE(new Request("http://localhost/api/push/subscribe", {
            method: "DELETE",
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json",
            },
        }));

        expect(disablePushSubscriptionMock).not.toHaveBeenCalled();
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            success: false,
            error: "endpoint가 필요합니다",
        });
    });
});
