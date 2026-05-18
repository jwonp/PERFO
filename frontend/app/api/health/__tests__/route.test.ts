import { describe, expect, it } from "vitest";

import { GET } from "../route";

describe("/api/health route", () => {
  it("GET은 프론트엔드 readiness 상태를 반환한다", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "frontend",
    });
  });
});
