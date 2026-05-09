import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;
const projectionReadApiEnabled = process.env.TICKETING_PROJECTION_READ_API_ENABLED === "true";
const projectionAllowedUserIds = process.env.TICKETING_PROJECTION_ALLOWED_USER_IDS ?? "";

export const GET = async (
    request: Request,
    context: { params: Promise<{ eventId: string }> },
) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!projectionReadApiEnabled || !isProjectionUserAllowed(session.user.id)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!backendUrl) {
        return NextResponse.json(
            { message: "BACKEND_URL is not configured" },
            { status: 500 },
        );
    }

    const { eventId } = await context.params;
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(
            {
                id: session.user.id,
                email: session.user.email,
            },
            ["ticketing:projection"],
        );
    } catch {
        return NextResponse.json(
            { message: "Internal API JWT signing is not configured" },
            { status: 500 },
        );
    }

    const backendRequestUrl = new URL(`${backendUrl}/api/ticketing/events/${eventId}/projection`);
    if (limit) {
        backendRequestUrl.searchParams.set("limit", limit);
    }

    const response = await fetch(backendRequestUrl.toString(), {
        method: "GET",
        headers: {
            ...authHeaders,
        },
    });

    const text = await response.text();
    const body = text
        ? (() => {
              try {
                  return JSON.parse(text);
              } catch {
                  return { message: text };
              }
          })()
        : {};

    return NextResponse.json(body, { status: response.status });
};

const isProjectionUserAllowed = (userId: string) => {
    const allowedIds = projectionAllowedUserIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return allowedIds.includes("*") || allowedIds.includes(userId);
};
