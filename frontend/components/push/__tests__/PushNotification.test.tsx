import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotification } from "../PushNotification";

const {
    fetchMock,
    requestPermissionMock,
    registerMock,
    getSubscriptionMock,
    subscribeMock,
} = vi.hoisted(() => ({
    fetchMock: vi.fn(),
    requestPermissionMock: vi.fn(),
    registerMock: vi.fn(),
    getSubscriptionMock: vi.fn(),
    subscribeMock: vi.fn(),
}));

describe("PushNotification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("fetch", fetchMock);
        fetchMock.mockImplementation(async (url: string) => {
            if (String(url) === "/api/push/public-key") {
                return { ok: true, json: async () => ({ publicKey: "BKQxVwVQJ3K1x0Kx0M2vVdWfYlS2YI9x3Wv4xq4xM9m8kN7p7H6h5G4f3E2d1C0b9A8z7Y6x5W4v3U2t1S0" }) };
            }
            return { ok: true, json: async () => ({}) };
        });
        requestPermissionMock.mockResolvedValue("granted");
        getSubscriptionMock.mockResolvedValue(null);
        subscribeMock.mockResolvedValue({
            endpoint: "https://push.example.test/subscriptions/1",
            toJSON: () => ({
                endpoint: "https://push.example.test/subscriptions/1",
                expirationTime: null,
                keys: {
                    p256dh: "p256dh-key",
                    auth: "auth-key",
                },
            }),
        });

        const registration = {
            pushManager: {
                getSubscription: getSubscriptionMock,
                subscribe: subscribeMock,
            },
        };

        Object.defineProperty(window, "Notification", {
            configurable: true,
            value: {
                requestPermission: requestPermissionMock,
            },
        });

        Object.defineProperty(window, "PushManager", {
            configurable: true,
            value: function PushManager() {},
        });

        Object.defineProperty(navigator, "serviceWorker", {
            configurable: true,
            value: {
                ready: Promise.resolve(registration),
                register: registerMock.mockResolvedValue(registration),
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("서버에서 공개키를 받아 푸시 구독을 진행한다", async () => {
        const user = userEvent.setup();

        render(
            <PushNotification>
                {({ subscribe, error }) => (
                    <>
                        <button onClick={() => void subscribe()}>subscribe</button>
                        {error && <span>{error}</span>}
                    </>
                )}
            </PushNotification>,
        );

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            "/api/push/public-key",
            expect.objectContaining({ method: "GET", cache: "no-store" }),
        ));

        await user.click(screen.getByRole("button", { name: "subscribe" }));

        await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/push/subscribe",
            expect.objectContaining({
                method: "POST",
                body: expect.stringContaining("https://push.example.test/subscriptions/1"),
            }),
        );
        expect(screen.queryByText("VAPID 공개키가 설정되지 않았습니다")).not.toBeInTheDocument();
    });

    it("서버 응답에 공개키가 없으면 오류를 표시한다", async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ publicKey: "" }),
        });

        render(
            <PushNotification>
                {({ subscribe, error }) => (
                    <>
                        <button onClick={() => void subscribe()}>subscribe</button>
                        {error && <span>{error}</span>}
                    </>
                )}
            </PushNotification>,
        );

        await user.click(screen.getByRole("button", { name: "subscribe" }));

        await waitFor(() => expect(screen.getByText("VAPID 공개키가 설정되지 않았습니다")).toBeInTheDocument());
        expect(subscribeMock).not.toHaveBeenCalled();
    });
});
