import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  bootstrapTicketSnapshots,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
  syncTicketNotifications,
} from "@/lib/notifications/notification-service"
import { resetStoreForTests } from "@/lib/server/json-store"

vi.mock("@/lib/push/server", () => ({
  sendPushNotification: vi.fn(async () => true),
}))

describe("notification-service", () => {
  beforeEach(async () => {
    await resetStoreForTests()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await resetStoreForTests()
  })

  it("상태가 처음 저장될 때는 알림을 만들지 않고 이후 변화에서 한 번만 만든다", async () => {
    const userId = "user-1"
    const tickets = [
      {
        scope: "reserved" as const,
        ticketId: "ticket-1",
        ticketName: "PERFO Summer Festival",
        targetUrl: "/ko/reserved/ticket-1",
        statuses: [
          { statusKey: "ticketingStatus" as const, statusValue: "PENDING" },
        ],
      },
    ]

    await syncTicketNotifications(userId, tickets)
    expect(await listNotifications(userId)).toHaveLength(0)

    await syncTicketNotifications(userId, [
      {
        ...tickets[0],
        statuses: [{ statusKey: "ticketingStatus", statusValue: "SUCCESS" }],
      },
    ])

    const notifications = await listNotifications(userId)
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.type).toBe("TICKET_SUCCESS")

    await syncTicketNotifications(userId, [
      {
        ...tickets[0],
        statuses: [{ statusKey: "ticketingStatus", statusValue: "SUCCESS" }],
      },
    ])

    expect(await listNotifications(userId)).toHaveLength(1)
  })

  it("초기 스냅샷 부트스트랩은 알림을 만들지 않는다", async () => {
    const userId = "user-bootstrap"

    await bootstrapTicketSnapshots(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-bootstrap",
        ticketName: "Bootstrap Ticket",
        targetUrl: "/ko/reserved/ticket-bootstrap",
        statuses: [
          { statusKey: "ticketingStatus", statusValue: "SUCCESS" },
          { statusKey: "usageStatus", statusValue: "MY_TURN" },
        ],
      },
    ])

    expect(await listNotifications(userId)).toHaveLength(0)

    await syncTicketNotifications(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-bootstrap",
        ticketName: "Bootstrap Ticket",
        targetUrl: "/ko/reserved/ticket-bootstrap",
        statuses: [
          { statusKey: "ticketingStatus", statusValue: "SUCCESS" },
          { statusKey: "usageStatus", statusValue: "USED" },
        ],
      },
    ])

    const notifications = await listNotifications(userId)
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.type).toBe("TICKET_USED")
  })

  it("푸시 구독이 있으면 알림 저장 후 delivery를 남긴다", async () => {
    const userId = "user-2"

    await savePushSubscription({
      userId,
      endpoint: "https://push.example/subscription",
      keys: {
        p256dh: "key-p256dh",
        auth: "key-auth",
      },
      userAgent: "vitest",
    })

    await syncTicketNotifications(userId, [
      {
        scope: "issued",
        ticketId: "issued-1",
        ticketName: "Jazz Night",
        targetUrl: "/ko/my-tickets/issued-1/scan",
        statuses: [{ statusKey: "issueStatus", statusValue: "INACTIVE" }],
      },
    ])

    await syncTicketNotifications(userId, [
      {
        scope: "issued",
        ticketId: "issued-1",
        ticketName: "Jazz Night",
        targetUrl: "/ko/my-tickets/issued-1/scan",
        statuses: [{ statusKey: "issueStatus", statusValue: "VERIFYING" }],
      },
    ])

    const notifications = await listNotifications(userId)
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.type).toBe("ISSUED_TICKET_VERIFYING")
  })

  it("읽음 처리와 모두 읽음 처리가 사용자 단위로 동작한다", async () => {
    const userId = "user-3"

    await syncTicketNotifications(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-3",
        ticketName: "Art Exhibition",
        targetUrl: "/ko/reserved/ticket-3",
        statuses: [{ statusKey: "usageStatus", statusValue: "WAITING" }],
      },
    ])
    await syncTicketNotifications(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-3",
        ticketName: "Art Exhibition",
        targetUrl: "/ko/reserved/ticket-3",
        statuses: [{ statusKey: "usageStatus", statusValue: "MY_TURN" }],
      },
    ])

    const notifications = await listNotifications(userId)
    expect(await getUnreadNotificationCount(userId)).toBe(1)

    await markNotificationRead(userId, notifications[0]!.id)
    expect(await getUnreadNotificationCount(userId)).toBe(0)

    await syncTicketNotifications(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-4",
        ticketName: "K-Pop Concert",
        targetUrl: "/ko/reserved/ticket-4",
        statuses: [{ statusKey: "usageStatus", statusValue: "WAITING" }],
      },
    ])
    await syncTicketNotifications(userId, [
      {
        scope: "reserved",
        ticketId: "ticket-4",
        ticketName: "K-Pop Concert",
        targetUrl: "/ko/reserved/ticket-4",
        statuses: [{ statusKey: "usageStatus", statusValue: "MY_TURN" }],
      },
    ])

    expect(await getUnreadNotificationCount(userId)).toBe(1)
    await markAllNotificationsRead(userId)
    expect(await getUnreadNotificationCount(userId)).toBe(0)
  })
})
