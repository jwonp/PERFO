import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
    getServerSessionMock: vi.fn(),
}));
const { createInternalProxyAuthHeadersMock } = vi.hoisted(() => ({
    createInternalProxyAuthHeadersMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
    getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth.config", () => ({
    authOptions: {},
}));

vi.mock("@/lib/server/internal-proxy-auth", () => ({
    createInternalProxyAuthHeaders: createInternalProxyAuthHeadersMock,
}));

const importRoute = async () => {
    vi.resetModules();
    vi.stubEnv("BACKEND_URL", "http://backend.test");
    return import("../route");
};

describe("/api/users/me/profile route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("PATCH는 사용자 프로필 수정 API를 프록시한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: "hong@example.com" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer users-jwt" });
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ name: "홍길동" }), { status: 200 })));

        const payload = { name: "홍길동" };
        const { PATCH } = await importRoute();
        const response = await PATCH(
            new Request("http://localhost/api/users/me/profile", {
                method: "PATCH",
                body: JSON.stringify(payload),
            }),
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/users/me/profile",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer users-jwt",
                },
                body: JSON.stringify(payload),
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ name: "홍길동" });
    });
});
