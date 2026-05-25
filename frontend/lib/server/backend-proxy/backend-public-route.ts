import { buildBackendUrlConfigResponse } from "./backend-proxy.func";
import { jsonFromBackendResponse } from "./backend-proxy-response";
import type { BackendProxyResult } from "./backend-proxy.types";

type PublicBackendRouteClient = {
    backendUrl: string;
};

type PublicBackendRouteRequestInit = {
    method: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    cache?: RequestCache;
};

export const requirePublicBackendRouteClient = (): BackendProxyResult<
    PublicBackendRouteClient
> => {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
        return {
            ok: false,
            response: buildBackendUrlConfigResponse(),
        };
    }

    return {
        ok: true,
        value: {
            backendUrl,
        },
    };
};

export const fetchPublicBackendRoute = (
    client: PublicBackendRouteClient,
    path: string,
    init: PublicBackendRouteRequestInit,
) => fetch(`${client.backendUrl}${path}`, init);

export const proxyPublicBackendJsonRoute = async <TFallback>(
    client: PublicBackendRouteClient,
    path: string,
    init: PublicBackendRouteRequestInit,
    fallbackBody: TFallback,
) => {
    const response = await fetchPublicBackendRoute(client, path, init);
    return jsonFromBackendResponse(response, fallbackBody);
};
