import { getRequiredSessionUser } from "./session";

export type RouteSessionUser = NonNullable<
    Awaited<ReturnType<typeof getRequiredSessionUser>>
>;

export const withRequiredSessionRoute = async <TResponse>(
    unauthorizedResponse: () => TResponse,
    handler: (user: RouteSessionUser) => Promise<TResponse>,
) => {
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
