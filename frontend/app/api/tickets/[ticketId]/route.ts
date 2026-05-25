import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const PATCH = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { ticketId } = await params;
    const payload = await request.json();

    return proxyBackendJsonRoute(proxyClient.value, `/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    }, {});
};
