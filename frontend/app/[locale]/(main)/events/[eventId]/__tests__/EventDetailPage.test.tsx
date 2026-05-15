import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventDetailPage from "../page";

const push = vi.fn();

vi.mock("@/i18n/navigation", () => ({
    useRouter: () => ({ push }),
}));

vi.mock("next-intl", () => ({
    useLocale: () => "ko",
    useTranslations: () => (key: string, values?: Record<string, unknown>) => {
        const messages: Record<string, string> = {
            "events.bookNow": "예매하기",
            "events.booking": "예매 처리 중...",
            "events.bookingFailed": "예매 요청에 실패했습니다.",
            "events.saleStatusOpen": "예매 가능",
            "events.saleStatusUpcoming": "오픈 예정",
            "events.saleStatusSoldOut": "매진",
            "events.saleStatusClosed": "판매 종료",
            "events.saleStatusInactive": "비활성화",
            "events.detailMetaVenue": "장소",
            "events.detailMetaOpen": "판매 시작",
            "events.detailMetaClose": "판매 종료",
            "events.detailMetaLimit": "1인당 최대",
            "events.detailMetaDiscovery": "노출 방식",
            "events.discoveryListed": "목록 노출",
            "events.discoveryLinkOnly": "링크 전용",
            "events.detailLoadError": "티켓 상세를 불러오지 못했습니다.",
            "events.remainingLabel": "잔여 수량",
        };
        return messages[key] ?? key;
    },
}));

describe("EventDetailPage", () => {
    beforeEach(() => {
        push.mockReset();
        vi.stubEnv("BACKEND_URL", "http://backend.test");
        vi.stubGlobal("crypto", { randomUUID: () => "request-1" } as Crypto);
        vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === "http://backend.test/api/events/11") {
                return {
                    ok: true,
                    json: async () => ({
                        id: 11,
                        name: "PERFO 2026 SEOUL",
                        venue: "올림픽공원",
                        detailAddress: "체조경기장",
                        validDate: "2026-08-15",
                        imageUrl: "/api/tickets/11/image",
                        saleOpenAt: "2026-05-20T03:00:00Z",
                        saleCloseAt: "2026-06-01T09:00:00Z",
                        remainingQuantity: 120,
                        totalQuantity: 300,
                        maxPerUser: 2,
                        discoveryMode: "LINK_ONLY",
                        saleStatus: "OPEN",
                    }),
                };
            }
            if (url === "/api/ticketing/requests" && init?.method === "POST") {
                return {
                    ok: true,
                    json: async () => ({ result: "SUCCESS" }),
                };
            }
            throw new Error(`unexpected fetch: ${url}`);
        }) as unknown as typeof fetch);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("상세를 렌더링하고 예매 성공 후 reserved로 이동한다", async () => {
        const user = userEvent.setup();
        render(await EventDetailPage({
            params: Promise.resolve({ locale: "ko", eventId: "11" }),
        }));

        expect(await screen.findByText("PERFO 2026 SEOUL")).toBeInTheDocument();
        expect(screen.getByText("링크 전용")).toBeInTheDocument();
        expect(screen.getByText((content) => content.includes("노출 방식") && content.includes("링크 전용"))).toBeInTheDocument();
        expect(screen.getByText("잔여 수량")).toBeInTheDocument();
        expect(screen.getByText("120 / 300")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "예매하기" }));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith(
            "/api/ticketing/requests",
            expect.objectContaining({ method: "POST" }),
        ));
        expect(push).toHaveBeenCalledWith("/reserved");
    });
});
