import { afterEach, describe, expect, it, vi } from "vitest";
import {
    cleanupTicketImage,
    createIssuedTicket,
    fetchIssuedTickets,
    updateIssuedTicket,
    uploadTicketImage,
} from "./my-tickets.api";
import type { TicketForm } from "./my-tickets.types";

const baseForm: TicketForm = {
    name: "PERFO Summer Festival",
    venue: "올림픽공원 체조경기장",
    googlePlaceId: "ChIJ12345",
    detailAddress: "2층 A게이트 앞",
    validDate: "2026-08-15",
    openAt: "2026-08-15T17:00",
    totalCount: "100",
    allowDuplicate: true,
    maxPerUser: "2",
    discoveryMode: "LINK_ONLY",
    status: "VERIFYING",
    imageKey: "owner-1/42/cover.png",
    imageUrl: "/api/tickets/42/image",
    imageFile: null,
};

describe("my-tickets.api", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("티켓 목록을 no-store로 조회한다", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => [{ id: 1 }],
        })) as unknown as typeof fetch);

        await expect(fetchIssuedTickets()).resolves.toEqual([{ id: 1 }]);
        expect(fetch).toHaveBeenCalledWith("/api/tickets", { cache: "no-store" });
    });

    it("생성 API는 json 요청 바디를 구성한다", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({ id: 999 }),
        })) as unknown as typeof fetch);

        await expect(createIssuedTicket(baseForm, "save failed")).resolves.toEqual({ id: 999 });

        const [, request] = vi.mocked(fetch).mock.calls[0];
        expect(request).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        expect(JSON.parse(String(request?.body))).toMatchObject({
            name: "PERFO Summer Festival",
            discoveryMode: "LINK_ONLY",
            totalCount: 100,
        });
    });

    it("생성 API는 이미지가 있으면 multipart 요청을 사용한다", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({ id: 999 }),
        })) as unknown as typeof fetch);

        const formWithImage: TicketForm = {
            ...baseForm,
            imageFile: new File(["png"], "cover.png", { type: "image/png" }),
        };

        await createIssuedTicket(formWithImage, "save failed");

        const [, request] = vi.mocked(fetch).mock.calls[0];
        expect(request?.body).toBeInstanceOf(FormData);
        const formData = request?.body as FormData;
        expect(formData.get("file")).toBeInstanceOf(File);
        await expect((formData.get("payload") as File).text()).resolves.toContain('"name":"PERFO Summer Festival"');
    });

    it("수정 API는 서버 에러 메시지를 그대로 던진다", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            json: async () => ({ message: "patch failed" }),
        })) as unknown as typeof fetch);

        await expect(updateIssuedTicket("42", baseForm, "owner-1/42/new.png", "save failed")).rejects.toThrow(
            "patch failed",
        );
    });

    it("업로드 API는 기본 에러 메시지를 fallback으로 사용한다", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            json: async () => {
                throw new Error("invalid json");
            },
        })) as unknown as typeof fetch);

        await expect(
            uploadTicketImage("42", new File(["png"], "cover.png", { type: "image/png" }), "save failed"),
        ).rejects.toThrow("save failed");
    });

    it("cleanup API는 삭제 실패를 무시한다", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("network");
            }) as unknown as typeof fetch,
        );

        await expect(cleanupTicketImage("42", "owner-1/42/new.png")).resolves.toBeUndefined();
        expect(fetch).toHaveBeenCalledWith(
            "/api/tickets/42/image?imageKey=owner-1%2F42%2Fnew.png",
            expect.objectContaining({ method: "DELETE" }),
        );
    });
});
