import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventDetailPage from "../page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
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
            "events.detailLoadError": "이벤트 상세를 불러오지 못했습니다.",
        };
        if (key === "events.remaining") {
            return `잔여 ${values?.remaining} / ${values?.total}`;
        }
        return messages[key] ?? key;
    },
}));

describe("EventDetailPage", () => {
    beforeEach(() => {
        push.mockReset();
        vi.stubGlobal("crypto", { randomUUID: () => "request-1" } as Crypto);
        vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url === "/api/events/11") {
                return {
                    ok: true,
                    json: async () => ({
                        id: 11,
                        name: "PERFO 2026 SEOUL",
                        venue: "올림픽공원",
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
        vi.unstubAllGlobals();
    });

    it("상세를 렌더링하고 예매 성공 후 reserved로 이동한다", async () => {
        const user = userEvent.setup();
        render(<EventDetailPage params={{ eventId: "11" }} />);

        expect(await screen.findByText("PERFO 2026 SEOUL")).toBeInTheDocument();
        expect(screen.getByText((content) => content.includes("링크 전용"))).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "예매하기" }));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith(
            "/api/ticketing/requests",
            expect.objectContaining({ method: "POST" }),
        ));
        expect(push).toHaveBeenCalledWith("/ko/reserved");
    });
});
