import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async () => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    return proxyBackendJsonRoute(
        proxyClient.value,
        `/api/reservations?userId=${encodeURIComponent(proxyClient.value.sessionUser.id)}`,
        {
            method: "GET",
            cache: "no-store",
        },
        [],
    );
};
