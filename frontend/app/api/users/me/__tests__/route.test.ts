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

describe("/api/users/me route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 내부 JWT를 붙여 백엔드 사용자 API로 전달한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: "hong@example.com" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer users-jwt" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ email: "hong@example.com" }), { status: 200 })),
        );

        const { GET } = await importRoute();
        const response = await GET();

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/users/me",
            {
                method: "GET",
                headers: { Authorization: "Bearer users-jwt" },
                cache: "no-store",
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ email: "hong@example.com" });
    });

    it("세션이 없으면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);
        vi.stubGlobal("fetch", vi.fn());

        const { GET } = await importRoute();
        const response = await GET();

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });

    it("이메일이 없는 세션이면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: null } });
        vi.stubGlobal("fetch", vi.fn());

        const { GET } = await importRoute();
        const response = await GET();

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });
});
