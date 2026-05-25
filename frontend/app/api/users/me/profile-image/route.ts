import { proxyBackendBinaryRoute, proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async () => {
    const proxyClient = await requireBackendRouteClient(["users"], { requireEmail: true });
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    return proxyBackendBinaryRoute(proxyClient.value, "/api/users/me/profile-image", {
        method: "GET",
        cache: "no-store",
    });
};

export const POST = async (request: Request) => {
    const proxyClient = await requireBackendRouteClient(["users"], { requireEmail: true });
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const formData = await request.formData();
    return proxyBackendJsonRoute(proxyClient.value, "/api/users/me/profile-image", {
        method: "POST",
        body: formData,
    }, { message: "Profile image upload failed" });
};
