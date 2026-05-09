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
    vi.stubEnv("TICKETING_PROJECTION_READ_API_ENABLED", "true");
    vi.stubEnv("TICKETING_PROJECTION_ALLOWED_USER_IDS", "42");
    return import("../route");
};

describe("/api/ticketing/events/[eventId]/projection route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 내부 JWT를 붙여 백엔드 projection API에 전달한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer signed-internal-jwt" });
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            eventId: 11,
                            projectedCount: 2,
                            successCount: 1,
                            rejectedCount: 1,
                            recentAttempts: [],
                        }),
                        { status: 200 },
                    ),
            ),
        );

        const { GET } = await importRoute();
        const response = await GET(
            new Request("http://localhost/api/ticketing/events/11/projection?limit=5"),
            { params: Promise.resolve({ eventId: "11" }) },
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/ticketing/events/11/projection?limit=5",
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer signed-internal-jwt",
                },
            },
        );
        expect(createInternalProxyAuthHeadersMock).toHaveBeenCalledWith(
            { id: "42", email: undefined },
            ["ticketing:projection"],
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            eventId: 11,
            projectedCount: 2,
            successCount: 1,
            rejectedCount: 1,
            recentAttempts: [],
        });
    });

    it("세션이 없으면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);
        vi.stubGlobal("fetch", vi.fn());

        const { GET } = await importRoute();
        const response = await GET(
            new Request("http://localhost/api/ticketing/events/11/projection"),
            { params: Promise.resolve({ eventId: "11" }) },
        );

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });

    it("허용된 운영 사용자가 아니면 403을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "99" } });
        vi.stubGlobal("fetch", vi.fn());

        const { GET } = await importRoute();
        const response = await GET(
            new Request("http://localhost/api/ticketing/events/11/projection"),
            { params: Promise.resolve({ eventId: "11" }) },
        );

        expect(fetch).not.toHaveBeenCalled();
        expect(createInternalProxyAuthHeadersMock).not.toHaveBeenCalled();
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
    });
});
