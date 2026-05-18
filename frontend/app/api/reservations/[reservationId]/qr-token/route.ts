import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;

export const POST = async (
    _request: Request,
    { params }: { params: Promise<{ reservationId: string }> },
) => {
    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
            { status: 500 },
        );
    }

    const { reservationId } = await params;
    const response = await fetch(`${backendUrl}/api/reservations/${reservationId}/qr-token`, {
        method: "POST",
        headers: authHeaders,
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
