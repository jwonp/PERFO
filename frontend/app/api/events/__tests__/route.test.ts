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

describe("/api/events route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 인증된 사용자로 백엔드 events API를 프록시한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer events-jwt" });
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: 11 }]), { status: 200 })));

        const { GET } = await importRoute();
        const response = await GET();

        expect(fetch).toHaveBeenCalledWith("http://backend.test/api/events", {
            method: "GET",
            headers: { Authorization: "Bearer events-jwt" },
            cache: "no-store",
        });
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([{ id: 11 }]);
    });
});
