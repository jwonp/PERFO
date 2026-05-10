import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;

const getSessionUser = async (): Promise<{ id: string; email?: string | null; role?: string | null } | null> => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        return null;
    }

    return { id: userId, email: session?.user?.email, role: session?.user?.role };
};

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(user, ["tickets"]);
    } catch {
        return NextResponse.json({ message: "Internal API JWT signing is not configured" }, { status: 500 });
    }

    const { ticketId } = await params;
    const response = await fetch(`${backendUrl}/api/tickets/${ticketId}/image`, {
        method: "GET",
        headers: authHeaders,
        cache: "no-store",
    });

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
        status: response.status,
        headers: {
            "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
            "Cache-Control": response.headers.get("Cache-Control") ?? "private, no-store",
        },
    });
};

export const POST = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(user, ["tickets"]);
    } catch {
        return NextResponse.json({ message: "Internal API JWT signing is not configured" }, { status: 500 });
    }

    const { ticketId } = await params;
    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/api/tickets/${ticketId}/image`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
    });

    const body = await response.json().catch(() => ({ message: "Ticket image upload failed" }));
    return NextResponse.json(body, { status: response.status });
};

export const DELETE = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(user, ["tickets"]);
    } catch {
        return NextResponse.json({ message: "Internal API JWT signing is not configured" }, { status: 500 });
    }

    const { ticketId } = await params;
    const url = new URL(request.url);
    const imageKey = url.searchParams.get("imageKey");

    if (!imageKey) {
        return NextResponse.json({ message: "imageKey is required" }, { status: 400 });
    }

    const response = await fetch(
        `${backendUrl}/api/tickets/${ticketId}/image?imageKey=${encodeURIComponent(imageKey)}`,
        {
            method: "DELETE",
            headers: authHeaders,
        },
    );

    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const body = await response.json().catch(() => ({ message: "Ticket image cleanup failed" }));
    return NextResponse.json(body, { status: response.status });
};
