import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const PATCH = async (request: Request) => {
    const proxyClient = await requireBackendRouteClient(["users"], { requireEmail: true });
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const payload = await request.json();
    return proxyBackendJsonRoute(proxyClient.value, "/api/users/me/profile", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    }, { message: "Profile update failed" });
};
