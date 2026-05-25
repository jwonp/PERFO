import { NextResponse } from "next/server";
import { createBackendRouteClient, proxyBackendJsonRoute } from "@/lib/server/backend-proxy/backend-proxy-route";
import { requireSessionUser } from "@/lib/server/backend-proxy/backend-proxy-session";
const projectionReadApiEnabled = process.env.TICKETING_PROJECTION_READ_API_ENABLED === "true";
const projectionAllowedUserIds = process.env.TICKETING_PROJECTION_ALLOWED_USER_IDS ?? "";

export const GET = async (
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser.response;
    }

    if (!projectionReadApiEnabled || !isProjectionUserAllowed(sessionUser.value.id)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const proxyClient = createBackendRouteClient(sessionUser.value, ["ticketing:projection"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { eventId } = await context.params;
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");

    const path = limit
        ? `/api/ticketing/events/${eventId}/projection?limit=${encodeURIComponent(limit)}`
        : `/api/ticketing/events/${eventId}/projection`;

    return proxyBackendJsonRoute(proxyClient.value, path, {
        method: "GET",
    }, {});
};

const isProjectionUserAllowed = (userId: string) => {
    const allowedIds = projectionAllowedUserIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return allowedIds.includes("*") || allowedIds.includes(userId);
};
