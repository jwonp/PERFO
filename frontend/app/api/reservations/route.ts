import { requireBackendProxyClient } from "@/lib/server/backend-proxy/backend-proxy-client";
import { jsonFromBackendResponse } from "@/lib/server/backend-proxy/backend-proxy-response";
import { requireSessionUser } from "@/lib/server/backend-proxy/backend-proxy-session";

export const GET = async () => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser.response;
    }

    const proxyClient = requireBackendProxyClient(sessionUser.value, ["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const response = await fetch(
        `${proxyClient.value.backendUrl}/api/reservations?userId=${encodeURIComponent(sessionUser.value.id)}`,
        {
            method: "GET",
            headers: proxyClient.value.authHeaders,
            cache: "no-store",
        },
    );

    return jsonFromBackendResponse(response, []);
};
