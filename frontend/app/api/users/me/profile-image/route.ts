import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

const backendUrl = process.env.BACKEND_URL;

const getSession = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
        return null;
    }

    return session;
};

export const GET = async () => {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/users/me/profile-image`, {
        method: "GET",
        headers: {
            "X-Auth-User-Id": session.user.id,
            "X-Auth-User-Email": session.user.email,
        },
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

export const POST = async (request: Request) => {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/api/users/me/profile-image`, {
        method: "POST",
        headers: {
            "X-Auth-User-Id": session.user.id,
            "X-Auth-User-Email": session.user.email,
        },
        body: formData,
    });

    const body = await response.json().catch(() => ({ message: "Profile image upload failed" }));
    return NextResponse.json(body, { status: response.status });
};
