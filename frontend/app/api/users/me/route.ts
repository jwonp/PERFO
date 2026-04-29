import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

const backendUrl = process.env.BACKEND_URL;

export const GET = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/users/me`, {
        method: "GET",
        headers: {
            "X-Auth-User-Id": session.user.id,
            "X-Auth-User-Email": session.user.email,
        },
        cache: "no-store",
    });

    const body = await response.json().catch(() => ({ message: "Profile fetch failed" }));
    return NextResponse.json(body, { status: response.status });
};
