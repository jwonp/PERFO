import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { buildUnauthorizedResponse } from "./backend-proxy.func";
import type { BackendProxyResult, BackendProxyUser } from "./backend-proxy.types";

export const requireSessionUser = async (): Promise<
    BackendProxyResult<BackendProxyUser>
> => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return {
            ok: false,
            response: buildUnauthorizedResponse(),
        };
    }

    return {
        ok: true,
        value: {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
        },
    };
};
