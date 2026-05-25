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

describe("backend proxy helpers", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
    });

    it("requireSessionUser는 세션 사용자가 없으면 401 응답을 반환한다", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const { requireSessionUser } = await import("../backend-proxy-session");

        const result = await requireSessionUser();

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.response.status).toBe(401);
        await expect(result.response.json()).resolves.toEqual({
            message: "Unauthorized",
        });
    });

    it("requireBackendProxyClient는 BACKEND_URL과 인증 헤더를 함께 반환한다", async () => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        createInternalProxyAuthHeadersMock.mockReturnValue({
            Authorization: "Bearer helper-jwt",
        });
        const { requireBackendProxyClient } = await import("../backend-proxy-client");

        const result = requireBackendProxyClient(
            { id: "user-1", email: "user@example.com", role: "USER" },
            ["tickets"],
        );

        expect(result).toEqual({
            ok: true,
            value: {
                backendUrl: "http://backend.test",
                authHeaders: {
                    Authorization: "Bearer helper-jwt",
                },
            },
        });
        expect(createInternalProxyAuthHeadersMock).toHaveBeenCalledWith(
            { id: "user-1", email: "user@example.com", role: "USER" },
            ["tickets"],
        );
    });

    it("requireBackendProxyClient는 내부 JWT 서명 실패를 500 응답으로 변환한다", async () => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        createInternalProxyAuthHeadersMock.mockImplementation(() => {
            throw new Error("missing config");
        });
        const { requireBackendProxyClient } = await import("../backend-proxy-client");

        const result = requireBackendProxyClient({ id: "user-1" }, ["tickets"]);

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.response.status).toBe(500);
        await expect(result.response.json()).resolves.toEqual({
            message: "Internal API JWT signing is not configured",
        });
    });

    it("parseBackendResponse는 빈 응답일 때 fallback body를 반환한다", async () => {
        const { parseBackendResponse } = await import("../backend-proxy-response");

        const body = await parseBackendResponse(new Response(null, { status: 204 }), []);

        expect(body).toEqual([]);
    });

    it("jsonFromBackendResponse는 텍스트 에러를 message 객체로 변환하고 status를 유지한다", async () => {
        const { jsonFromBackendResponse } = await import("../backend-proxy-response");

        const response = await jsonFromBackendResponse(
            new Response("backend exploded", { status: 502 }),
            {},
        );

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
            message: "backend exploded",
        });
    });
});
