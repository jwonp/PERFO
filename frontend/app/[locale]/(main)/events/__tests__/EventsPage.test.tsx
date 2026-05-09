import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import EventsPage from "../page";

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => {
        const messages: Record<string, string> = {
            "events.title": "예매 가능한 이벤트",
            "events.empty": "지금 노출 중인 이벤트가 없습니다",
            "events.saleStatusOpen": "예매 가능",
            "events.saleStatusUpcoming": "오픈 예정",
            "events.saleStatusSoldOut": "매진",
            "events.saleStatusClosed": "판매 종료",
            "events.saleStatusInactive": "비활성화",
        };
        if (key === "events.remaining") {
            return `잔여 ${values?.remaining} / ${values?.total}`;
        }
        return messages[key] ?? key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
    Link: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

describe("EventsPage", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => [],
        })) as unknown as typeof fetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("LISTED 이벤트 목록을 렌더링한다", async () => {
        vi.mocked(fetch).mockImplementationOnce(async () => ({
            ok: true,
            json: async () => [
                {
                    id: 11,
                    name: "PERFO 2026 SEOUL",
                    venue: "올림픽공원",
                    remainingQuantity: 120,
                    totalQuantity: 300,
                    saleStatus: "OPEN",
                    publicBookingPath: "/events/11",
                },
            ],
        }) as Response);

        render(<EventsPage />);

        expect(await screen.findByText("PERFO 2026 SEOUL")).toBeInTheDocument();
        expect(screen.getByText("잔여 120 / 300")).toBeInTheDocument();
    });

    it("빈 목록이면 빈 상태를 표시한다", async () => {
        render(<EventsPage />);

        await waitFor(() => expect(screen.getByText("지금 노출 중인 이벤트가 없습니다")).toBeInTheDocument());
    });
});
