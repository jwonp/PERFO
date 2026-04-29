import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

const backendUrl = process.env.BACKEND_URL;

export const PATCH = async (request: Request) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const payload = await request.json();
    const response = await fetch(`${backendUrl}/api/users/me/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "X-Auth-User-Id": session.user.id,
            "X-Auth-User-Email": session.user.email,
        },
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({ message: "Profile update failed" }));
    return NextResponse.json(body, { status: response.status });
};
