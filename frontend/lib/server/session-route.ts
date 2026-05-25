import { NextResponse } from "next/server";
import { getRequiredSessionUser } from "./session";

export type RouteSessionUser = NonNullable<
    Awaited<ReturnType<typeof getRequiredSessionUser>>
>;

export const withRequiredSessionRoute = async <TResponse>(
    unauthorizedResponse: () => NextResponse<unknown>,
    handler: (user: RouteSessionUser) => Promise<TResponse>,
): Promise<TResponse | NextResponse<unknown>> => {
    const user = await getRequiredSessionUser();
    if (!user) {
        return unauthorizedResponse();
    }

    return handler(user);
};

export const withRouteErrorHandling = async <TResponse>(
    handler: () => Promise<TResponse>,
    onError: (error: unknown) => TResponse,
) => {
    try {
        return await handler();
    } catch (error) {
        return onError(error);
    }
};
