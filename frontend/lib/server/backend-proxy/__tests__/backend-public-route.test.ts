import { afterEach, describe, expect, it, vi } from "vitest";

describe("public backend route helpers", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("requirePublicBackendRouteClient는 BACKEND_URL이 없으면 500 응답을 반환한다", async () => {
        const { requirePublicBackendRouteClient } = await import("../backend-public-route");

        const result = requirePublicBackendRouteClient();

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }

        expect(result.response.status).toBe(500);
        await expect(result.response.json()).resolves.toEqual({
            message: "BACKEND_URL is not configured",
        });
    });

    it("proxyPublicBackendJsonRoute는 backend JSON 응답을 그대로 전달한다", async () => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ available: true }), { status: 200 })),
        );
        const { proxyPublicBackendJsonRoute, requirePublicBackendRouteClient } = await import("../backend-public-route");
        const client = requirePublicBackendRouteClient();

        expect(client.ok).toBe(true);
        if (!client.ok) {
            return;
        }

        const response = await proxyPublicBackendJsonRoute(
            client.value,
            "/api/auth/check-email?email=test%40example.com",
            {
                method: "GET",
                cache: "no-store",
            },
            { message: "fallback" },
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/auth/check-email?email=test%40example.com",
            {
                method: "GET",
                cache: "no-store",
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ available: true });
    });
});
