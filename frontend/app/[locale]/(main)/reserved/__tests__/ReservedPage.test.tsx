import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReservedPage from "../page";

vi.mock("@/components/notifications/NotificationButton", () => ({
  NotificationButton: () => <div>NotificationButton</div>,
}));

vi.mock("@/components/notifications/use-notification-snapshot-bootstrap", () => ({
  useNotificationSnapshotBootstrap: vi.fn(),
}));

vi.mock("@/components/tickets/TicketCard", () => ({
  TicketCard: ({ name, venue }: { name: string; venue: string }) => (
    <article>
      <div>{name}</div>
      <div>{venue}</div>
    </article>
  ),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "reserved.title": "예약한 티켓",
      "reserved.tabAll": "전체",
      "reserved.tabUsed": "사용 완료",
      "reserved.empty": "예약한 티켓이 없습니다",
      "reserved.emptyUsed": "아직 사용 완료된 티켓이 없습니다",
      "reserved.qrShow": "QR 표시",
    };
    return messages[key] ?? key;
  },
}));

describe("ReservedPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => [],
    })) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("백엔드가 빈 목록을 반환하면 빈 상태를 표시한다", async () => {
    render(<ReservedPage />);

    await waitFor(() => expect(screen.getByText("예약한 티켓이 없습니다")).toBeInTheDocument());
  });

  it("백엔드에서 받은 예약 티켓 목록을 렌더링한다", async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 42,
          name: "Reserved Ticket",
          ticketNumber: 12,
          totalCount: 100,
          venue: "잠실실내체육관",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "MY_TURN",
        },
      ],
    }) as Response);

    render(<ReservedPage />);

    const ticket = await screen.findByText("Reserved Ticket");
    expect(ticket.closest("article")).toHaveTextContent("잠실실내체육관");
  });

  it("사용 완료 탭은 사용 완료 티켓만 남긴다", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: "My Turn Ticket",
          ticketNumber: 12,
          totalCount: 100,
          venue: "잠실실내체육관",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "MY_TURN",
        },
        {
          id: 2,
          name: "Used Ticket",
          ticketNumber: 13,
          totalCount: 100,
          venue: "KSPO DOME",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "USED",
        },
      ],
    }) as Response);

    render(<ReservedPage />);
    await screen.findByText("My Turn Ticket");

    await user.click(screen.getByRole("button", { name: "사용 완료" }));

    await waitFor(() => {
      expect(screen.queryByText("My Turn Ticket")).not.toBeInTheDocument();
      expect(screen.getByText("Used Ticket")).toBeInTheDocument();
    });
  });

  it("전체 탭으로 돌아오면 전체 목록이 다시 보인다", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: "My Turn Ticket",
          ticketNumber: 12,
          totalCount: 100,
          venue: "잠실실내체육관",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "MY_TURN",
        },
        {
          id: 2,
          name: "Used Ticket",
          ticketNumber: 13,
          totalCount: 100,
          venue: "KSPO DOME",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "USED",
        },
      ],
    }) as Response);

    render(<ReservedPage />);
    await screen.findByText("My Turn Ticket");

    await user.click(screen.getByRole("button", { name: "사용 완료" }));
    await screen.findByText("Used Ticket");

    await user.click(screen.getByRole("button", { name: "전체" }));

    await waitFor(() => {
      expect(screen.getByText("My Turn Ticket")).toBeInTheDocument();
      expect(screen.getByText("Used Ticket")).toBeInTheDocument();
    });
  });

  it("사용 완료 필터 결과가 없으면 전용 빈 상태를 표시한다", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(async () => ({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: "My Turn Ticket",
          ticketNumber: 12,
          totalCount: 100,
          venue: "잠실실내체육관",
          validDate: "2026-09-01",
          ticketingStatus: "SUCCESS",
          usageStatus: "MY_TURN",
        },
      ],
    }) as Response);

    render(<ReservedPage />);
    await screen.findByText("My Turn Ticket");

    await user.click(screen.getByRole("button", { name: "사용 완료" }));

    await waitFor(() => {
      expect(screen.getByText("아직 사용 완료된 티켓이 없습니다")).toBeInTheDocument();
      expect(screen.queryByText("My Turn Ticket")).not.toBeInTheDocument();
    });
  });
});
