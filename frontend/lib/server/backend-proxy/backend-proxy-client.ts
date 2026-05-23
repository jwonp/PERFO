import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";
import {
    buildBackendUrlConfigResponse,
    buildInternalApiJwtConfigResponse,
} from "./backend-proxy.func";
import type {
    BackendProxyAuthHeaders,
    BackendProxyResult,
    BackendProxyUser,
} from "./backend-proxy.types";

export const createBackendAuthHeaders = (
    user: BackendProxyUser,
    scopes: string[],
): BackendProxyAuthHeaders => createInternalProxyAuthHeaders(user, scopes);

export const requireBackendProxyClient = (
    user: BackendProxyUser,
    scopes: string[],
): BackendProxyResult<{
    backendUrl: string;
    authHeaders: BackendProxyAuthHeaders;
}> => {
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
        return {
            ok: false,
            response: buildBackendUrlConfigResponse(),
        };
    }

    try {
        return {
            ok: true,
            value: {
                backendUrl,
                authHeaders: createBackendAuthHeaders(user, scopes),
            },
        };
    } catch {
        return {
            ok: false,
            response: buildInternalApiJwtConfigResponse(),
        };
    }
};
