import { createInternalApiJwt } from "@/lib/server/internal-api-jwt";

type InternalProxyUser = {
    id: string;
    email?: string | null;
};

export const createInternalProxyAuthHeaders = (
    user: InternalProxyUser,
    scopes: string[],
) => {
    const token = createInternalApiJwt({
        userId: user.id,
        email: user.email,
        scopes,
    });

    return {
        Authorization: `Bearer ${token}`,
    };
};
