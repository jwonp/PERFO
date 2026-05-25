import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ eventId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { eventId } = await params;
    return proxyBackendJsonRoute(proxyClient.value, `/api/events/${eventId}`, {
        method: "GET",
        cache: "no-store",
    }, {});
};
