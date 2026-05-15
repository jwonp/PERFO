import { afterEach, describe, expect, it, vi } from "vitest";

const importRoute = async () => {
    vi.resetModules();
    return import("../route");
};

describe("/api/push/public-key route", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it("GET은 런타임 VAPID 공개키를 반환한다", async () => {
        vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "runtime-public-key");

        const { GET } = await importRoute();
        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            success: true,
            publicKey: "runtime-public-key",
        });
    });
});
