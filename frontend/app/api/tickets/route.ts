import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;

export const GET = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!backendUrl) {
        return NextResponse.json(
            { message: "BACKEND_URL is not configured" },
            { status: 500 }
        );
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(
            {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
            },
            ["tickets"],
        );
    } catch {
        return NextResponse.json(
            { message: "Internal API JWT signing is not configured" },
            { status: 500 }
        );
    }

    const response = await fetch(`${backendUrl}/api/tickets?ownerUserId=${encodeURIComponent(session.user.id)}`, {
        method: "GET",
        headers: authHeaders,
        cache: "no-store",
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
        : [];

    return NextResponse.json(body, { status: response.status });
};

export const POST = async (request: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!backendUrl) {
        return NextResponse.json(
            { message: "BACKEND_URL is not configured" },
            { status: 500 }
        );
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(
            {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
            },
            ["tickets"],
        );
    } catch {
        return NextResponse.json(
            { message: "Internal API JWT signing is not configured" },
            { status: 500 }
        );
    }

    const payload = await request.json();
    const response = await fetch(`${backendUrl}/api/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
        },
        body: JSON.stringify({
            ...payload,
            ownerUserId: session.user.id,
        }),
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

    if (!response.ok) {
        return NextResponse.json(
            { message: body.message ?? "Ticket creation failed" },
            { status: response.status }
        );
    }

    return NextResponse.json(body, { status: 200 });
};
