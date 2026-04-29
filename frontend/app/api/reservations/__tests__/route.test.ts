import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth/auth.config", () => ({
  authOptions: {},
}));

const importRoute = async () => {
  vi.resetModules();
  vi.stubEnv("BACKEND_URL", "http://backend.test");
  return import("../route");
};

describe("/api/reservations route", () => {
  afterEach(() => {
    getServerSessionMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("GET은 세션 사용자 id를 userId로 백엔드에 전달한다", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "user-42" } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      {
        id: 10,
        name: "Reserved Ticket",
        usageStatus: "MY_TURN",
      },
    ]), { status: 200 })));

    const { GET } = await importRoute();
    const response = await GET();

    expect(fetch).toHaveBeenCalledWith(
      "http://backend.test/api/reservations?userId=user-42",
      { method: "GET", cache: "no-store" },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 10,
        name: "Reserved Ticket",
        usageStatus: "MY_TURN",
      },
    ]);
  });
});
