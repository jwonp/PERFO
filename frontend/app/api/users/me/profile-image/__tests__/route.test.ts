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

describe("/api/users/me/profile-image route", () => {
    afterEach(() => {
        getServerSessionMock.mockReset();
        createInternalProxyAuthHeadersMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("GET은 프로필 이미지 binary 응답을 프록시한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: "hong@example.com" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer users-jwt" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { "Content-Type": "image/png" },
            })),
        );

        const { GET } = await importRoute();
        const response = await GET();

        expect(fetch).toHaveBeenCalledWith(
            "http://backend.test/api/users/me/profile-image",
            {
                method: "GET",
                headers: { Authorization: "Bearer users-jwt" },
                cache: "no-store",
            },
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("image/png");
    });

    it("POST는 프로필 이미지 multipart 업로드를 프록시한다", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "42", email: "hong@example.com" } });
        createInternalProxyAuthHeadersMock.mockReturnValue({ Authorization: "Bearer users-jwt" });
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ imageUrl: "/profile.png" }), { status: 200 })));

        const formData = new FormData();
        formData.set("file", new File(["png"], "profile.png", { type: "image/png" }));
        const { POST } = await importRoute();
        const response = await POST(
            new Request("http://localhost/api/users/me/profile-image", {
                method: "POST",
                body: formData,
            }),
        );

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, init] = vi.mocked(fetch).mock.calls[0];
        expect(url).toBe("http://backend.test/api/users/me/profile-image");
        expect(init).toMatchObject({
            method: "POST",
            headers: { Authorization: "Bearer users-jwt" },
        });
        expect(typeof (init?.body as FormData).get).toBe("function");
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ imageUrl: "/profile.png" });
    });
});
