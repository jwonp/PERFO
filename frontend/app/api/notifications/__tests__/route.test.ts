import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
    getServerSessionMock: vi.fn(),
}));
const { listNotificationsMock } = vi.hoisted(() => ({
    listNotificationsMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
    getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth.config", () => ({
    authOptions: {},
}));

vi.mock("@/lib/notifications/notification-service", () => ({
    listNotifications: listNotificationsMock,
}));

const importRoute = async () => {
    vi.resetModules();
    return import("../route");
};

describe("/api/notifications route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        listNotificationsMock.mockReset();
        vi.resetModules();
    });

    it("세션이 없으면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);

        const { GET } = await importRoute();
        const response = await GET();

        expect(listNotificationsMock).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });

    it("세션이 있으면 알림 목록을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
        listNotificationsMock.mockResolvedValue([{ id: "n1" }]);

        const { GET } = await importRoute();
        const response = await GET();

        expect(listNotificationsMock).toHaveBeenCalledWith("user-1");
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            notifications: [{ id: "n1" }],
        });
    });
});
