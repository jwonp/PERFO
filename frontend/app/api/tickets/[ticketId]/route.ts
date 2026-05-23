import { requireBackendProxyClient } from "@/lib/server/backend-proxy/backend-proxy-client";
import { jsonFromBackendResponse } from "@/lib/server/backend-proxy/backend-proxy-response";
import { requireSessionUser } from "@/lib/server/backend-proxy/backend-proxy-session";

export const PATCH = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser.response;
    }

    const proxyClient = requireBackendProxyClient(sessionUser.value, ["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { ticketId } = await params;
    const payload = await request.json();

    const response = await fetch(`${proxyClient.value.backendUrl}/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...proxyClient.value.authHeaders,
        },
        body: JSON.stringify(payload),
    });

    return jsonFromBackendResponse(response, {});
};
