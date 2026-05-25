import { afterEach, describe, expect, it, vi } from "vitest";

const importRoute = async () => {
    vi.resetModules();
    vi.stubEnv("BACKEND_URL", "http://backend.test");
    return import("../route.ts");
};

describe("/api/public/tickets/[ticketId]/image route", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 인증 없이 백엔드 공개 이미지 엔드포인트를 프록시한다", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(new Uint8Array([1, 2, 3]), {
                        status: 200,
                        headers: {
                            "Content-Type": "image/png",
                            "Cache-Control": "public, max-age=60",
                        },
                    }),
            ),
        );

        const { GET } = await importRoute();
        const response = await GET(
            new Request("http://localhost/api/public/tickets/11/image"),
            { params: Promise.resolve({ ticketId: "11" }) },
        );

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/public/tickets/11/image",
            expect.objectContaining({
                method: "GET",
                cache: "no-store",
            }),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
    });
});
