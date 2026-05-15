import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;

export const GET = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    let authHeaders: { Authorization: string };
    try {
        authHeaders = createInternalProxyAuthHeaders(
            {
                id: session.user.id,
                email: session.user.email,
                role: session.user.role,
            },
            ["users"],
        );
    } catch {
        return NextResponse.json({ message: "Internal API JWT signing is not configured" }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/users/me`, {
        method: "GET",
        headers: authHeaders,
        cache: "no-store",
    });

    const body = await response.json().catch(() => ({ message: "Profile fetch failed" }));
    return NextResponse.json(body, { status: response.status });
};
