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

describe("/api/reservations/[reservationId]/qr-token route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("POST는 인증된 예약 사용자의 QR 토큰 발급 API를 프록시한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: "hong@example.com", role: "USER" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer tickets-jwt" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ token: "opaque", expiresAt: "2026-06-01T12:00:00Z" }), { status: 200 })),
        );

        const { POST } = await importRoute();
        const response = await POST(
            new Request("http://localhost/api/reservations/10/qr-token", { method: "POST" }),
            { params: Promise.resolve({ reservationId: "10" }) },
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/reservations/10/qr-token",
            {
                method: "POST",
                headers: { Authorization: "Bearer tickets-jwt" },
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ token: "opaque", expiresAt: "2026-06-01T12:00:00Z" });
    });
});
