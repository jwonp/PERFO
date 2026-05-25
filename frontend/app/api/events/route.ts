import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async () => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    return proxyBackendJsonRoute(proxyClient.value, "/api/events", {
        method: "GET",
        cache: "no-store",
    }, []);
};
