import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async () => {
    const proxyClient = await requireBackendRouteClient(["users"], { requireEmail: true });
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    return proxyBackendJsonRoute(proxyClient.value, "/api/users/me", {
        method: "GET",
        cache: "no-store",
    }, { message: "Profile fetch failed" });
};
