import { afterEach, describe, expect, it, vi } from "vitest";

const importRoute = async () => {
    vi.resetModules();
    return import("../route");
};

describe("/api/auth/check-email route", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 공개 backend auth route helper를 통해 email lookup을 프록시한다", async () => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ available: false }), { status: 200 })),
        );

        const { GET } = await importRoute();
        const response = await GET(new Request("http://localhost/api/auth/check-email?email=hong@example.com"));

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/auth/check-email?email=hong%40example.com",
            {
                method: "GET",
                cache: "no-store",
            },
        );
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ available: false });
    });

    it("email이 없으면 400을 반환한다", async () => {
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.stubGlobal("fetch", vi.fn());

        const { GET } = await importRoute();
        const response = await GET(new Request("http://localhost/api/auth/check-email"));

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ message: "email is required" });
    });
});
