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

describe("/api/tickets/[ticketId]/validations route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("POST는 검표 요청을 백엔드 validation API로 전달한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "owner-1", email: "owner@example.com", role: "USER" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer tickets-jwt" });
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ result: "SUCCESS" }), { status: 200 })));

        const payload = { qrToken: "opaque-token" };
        const { POST } = await importRoute();
        const response = await POST(
            new Request("http://localhost/api/tickets/5/validations", {
                method: "POST",
                body: JSON.stringify(payload),
            }),
            { params: Promise.resolve({ ticketId: "5" }) },
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/tickets/5/validations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer tickets-jwt",
                },
                body: JSON.stringify(payload),
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ result: "SUCCESS" });
    });
});
