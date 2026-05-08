import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
    getServerSessionMock: vi.fn(),
}));
const { createInternalProxyAuthHeadersMock } = vi.hoisted(() => ({
    createInternalProxyAuthHeadersMock: vi.fn(),
}));

const { createInternalApiJwtMock } = vi.hoisted(() => ({
    createInternalApiJwtMock: vi.fn(),
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

describe("/api/ticketing/requests route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("POST는 세션 사용자 id를 헤더로 붙여 백엔드 구매 API에 전달한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer signed-internal-jwt" });
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            requestId: "req_phase1_0001",
                            result: "SUCCESS",
                        }),
                        { status: 200 },
                    ),
            ),
        );

        const payload = {
            requestId: "req_phase1_0001",
            eventId: 11,
            quantity: 1,
        };
        const { POST } = await importRoute();

        const response = await POST(
            new Request("http://localhost/api/ticketing/requests", {
                method: "POST",
                body: JSON.stringify(payload),
            }),
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/ticketing/requests",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer signed-internal-jwt",
                },
                body: JSON.stringify(payload),
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            requestId: "req_phase1_0001",
            result: "SUCCESS",
        });
    });

    it("세션이 없으면 401을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);
        vi.stubGlobal("fetch", vi.fn());

        const { POST } = await importRoute();

        const response = await POST(
            new Request("http://localhost/api/ticketing/requests", {
                method: "POST",
                body: JSON.stringify({ requestId: "req_phase1_0002", eventId: 11, quantity: 1 }),
            }),
        );

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
    });

    it("내부 JWT 서명이 구성되지 않으면 500을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42" } });
        createInternalProxyAuthHeadersMock.mockImplementation(() => {
            throw new Error("missing config");
        });
        vi.stubGlobal("fetch", vi.fn());
        const { POST } = await importRoute();

        const response = await POST(
            new Request("http://localhost/api/ticketing/requests", {
                method: "POST",
                body: JSON.stringify({ requestId: "req_phase1_0003", eventId: 11, quantity: 1 }),
            }),
        );

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ message: "Internal API JWT signing is not configured" });
    });
});
