import { requireBackendProxyClient } from "./backend-proxy-client";
import { buildUnauthorizedResponse } from "./backend-proxy.func";
import { jsonFromBackendResponse, binaryFromBackendResponse } from "./backend-proxy-response";
import { requireSessionUser } from "./backend-proxy-session";
import type { BackendProxyAuthHeaders, BackendProxyResult, BackendProxyUser } from "./backend-proxy.types";

type BackendRouteProxyClient = {
    sessionUser: BackendProxyUser;
    backendUrl: string;
    authHeaders: BackendProxyAuthHeaders;
};

type BackendRouteRequestInit = {
    method: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
    cache?: RequestCache;
};

type RequireBackendRouteClientOptions = {
    requireEmail?: boolean;
};

export const requireBackendRouteClient = async (
    scopes: string[],
    options: RequireBackendRouteClientOptions = {},
): Promise<BackendProxyResult<BackendRouteProxyClient>> => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser;
    }

    if (options.requireEmail && !sessionUser.value.email) {
        return {
            ok: false,
            response: buildUnauthorizedResponse(),
        };
    }

    return createBackendRouteClient(sessionUser.value, scopes);
};

export const createBackendRouteClient = (
    sessionUser: BackendProxyUser,
    scopes: string[],
): BackendProxyResult<BackendRouteProxyClient> => {
    const proxyClient = requireBackendProxyClient(sessionUser, scopes);
    if (!proxyClient.ok) {
        return proxyClient;
    }

    return {
        ok: true,
        value: {
            sessionUser,
            backendUrl: proxyClient.value.backendUrl,
            authHeaders: proxyClient.value.authHeaders,
        },
    };
};

export const fetchBackendRoute = (
    client: BackendRouteProxyClient,
    path: string,
    init: BackendRouteRequestInit,
) => fetch(`${client.backendUrl}${path}`, {
    ...init,
    headers: {
        ...init.headers,
        ...client.authHeaders,
    },
});

export const proxyBackendJsonRoute = async <TFallback>(
    client: BackendRouteProxyClient,
    path: string,
    init: BackendRouteRequestInit,
    fallbackBody: TFallback,
) => {
    const response = await fetchBackendRoute(client, path, init);
    return jsonFromBackendResponse(response, fallbackBody);
};

export const proxyBackendBinaryRoute = async (
    client: BackendRouteProxyClient,
    path: string,
    init: BackendRouteRequestInit,
    fallbackContentType?: string,
    fallbackCacheControl?: string,
) => {
    const response = await fetchBackendRoute(client, path, init);
    return binaryFromBackendResponse(response, fallbackContentType, fallbackCacheControl);
};
