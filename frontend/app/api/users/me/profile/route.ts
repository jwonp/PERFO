import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { createInternalProxyAuthHeaders } from "@/lib/server/internal-proxy-auth";

const backendUrl = process.env.BACKEND_URL;

export const PATCH = async (request: Request) => {
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
            },
            ["users"],
        );
    } catch {
        return NextResponse.json({ message: "Internal API JWT signing is not configured" }, { status: 500 });
    }

    const payload = await request.json();
    const response = await fetch(`${backendUrl}/api/users/me/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
        },
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({ message: "Profile update failed" }));
    return NextResponse.json(body, { status: response.status });
};
