import { proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const POST = async (
    _request: Request,
    { params }: { params: Promise<{ reservationId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { reservationId } = await params;
    return proxyBackendJsonRoute(proxyClient.value, `/api/reservations/${reservationId}/qr-token`, {
        method: "POST",
    }, {});
};
