import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
    getServerSessionMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
    getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth.config", () => ({
    authOptions: {},
}));

describe("session route helpers", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        vi.resetModules();
    });

    it("withRequiredSessionRoute는 세션이 없으면 unauthorized response를 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const { withRequiredSessionRoute } = await import("./session-route");

        const response = await withRequiredSessionRoute(
            () => new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
            async () => new Response(null, { status: 204 }),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });

    it("withRequiredSessionRoute는 세션이 있으면 handler에 전달한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "user-1", email: "user@example.com" } });
        const { withRequiredSessionRoute } = await import("./session-route");

        const response = await withRequiredSessionRoute(
            () => new Response(null, { status: 401 }),
            async (user) => new Response(JSON.stringify({ userId: user.id }), { status: 200 }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ userId: "user-1" });
    });
});
