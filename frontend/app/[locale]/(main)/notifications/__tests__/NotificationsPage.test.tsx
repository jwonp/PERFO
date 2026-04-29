import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import NotificationsPage from "../page"

const push = vi.fn()
const back = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    back,
  }),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, number>) => {
    const messages: Record<string, string> = {
      title: "알림",
      back: "뒤로",
      read: "읽음 처리",
      readAll: "모두 읽음",
      loading: "알림을 불러오는 중입니다.",
      empty: "아직 알림이 없습니다.",
      loadError: "알림을 불러오지 못했습니다.",
      readError: "알림 읽음 처리에 실패했습니다.",
      readAllError: "모두 읽음 처리에 실패했습니다.",
    }

    if (key === "summary") {
      return `읽지 않은 알림 ${values?.count ?? 0}개`
    }

    return messages[key] ?? key
  },
}))

describe("NotificationsPage", () => {
  beforeEach(() => {
    push.mockReset()
    back.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("알림 목록과 읽지 않은 개수를 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === "/api/notifications" && (init?.method ?? "GET") === "GET") {
        return {
          ok: true,
          json: async () => ({
            notifications: [
              {
                id: "n1",
                type: "TICKET_SUCCESS",
                title: "티켓 예약 완료",
                body: "PERFO Summer Festival 예약이 완료되었습니다.",
                targetUrl: "/ko/reserved/1",
                sourceType: "reserved",
                sourceId: "1",
                dedupeKey: "reserved:1:ticketingStatus:SUCCESS",
                readAt: null,
                createdAt: "2026-04-29T12:00:00.000Z",
                ticketName: "PERFO Summer Festival",
              },
            ],
          }),
        }
      }

      throw new Error(`unexpected fetch: ${url}`)
    }) as unknown as typeof fetch)

    render(<NotificationsPage />)

    await waitFor(() => expect(screen.getByText("티켓 예약 완료")).toBeInTheDocument())
    expect(screen.getByText("읽지 않은 알림 1개")).toBeInTheDocument()
    expect(screen.getByText("PERFO Summer Festival")).toBeInTheDocument()
  })

  it("알림 클릭 시 읽음 처리 후 대상 화면으로 이동한다", async () => {
    const user = userEvent.setup()

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === "/api/notifications" && (init?.method ?? "GET") === "GET") {
        return {
          ok: true,
          json: async () => ({
            notifications: [
              {
                id: "n1",
                type: "TICKET_MY_TURN",
                title: "입장 차례 도착",
                body: "PERFO Summer Festival 입장 차례입니다. QR을 준비해 주세요.",
                targetUrl: "/ko/reserved/1",
                sourceType: "reserved",
                sourceId: "1",
                dedupeKey: "reserved:1:usageStatus:MY_TURN",
                readAt: null,
                createdAt: "2026-04-29T12:00:00.000Z",
                ticketName: "PERFO Summer Festival",
              },
            ],
          }),
        }
      }

      if (url === "/api/notifications/n1/read" && init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ notification: { id: "n1" } }),
        }
      }

      throw new Error(`unexpected fetch: ${url}`)
    }) as unknown as typeof fetch)

    render(<NotificationsPage />)

    await waitFor(() => expect(screen.getByText("입장 차례 도착")).toBeInTheDocument())
    await user.click(screen.getByRole("button", { name: /입장 차례 도착/i }))

    await waitFor(() => expect(push).toHaveBeenCalledWith("/ko/reserved/1"))
  })
})
