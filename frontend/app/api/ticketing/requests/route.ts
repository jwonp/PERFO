import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const POST = async (request: Request) => {
    const proxyClient = await requireBackendRouteClient(["ticketing"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }
    const payload = await request.json();
    return proxyBackendJsonRoute(proxyClient.value, "/api/ticketing/requests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    }, {});
};
