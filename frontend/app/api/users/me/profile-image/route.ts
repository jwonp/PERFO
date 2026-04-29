import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

const backendUrl = process.env.BACKEND_URL;

const getSessionUser = async (): Promise<{ id: string; email: string } | null> => {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) {
        return null;
    }

    return { id: userId, email: userEmail };
};

export const GET = async () => {
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const response = await fetch(`${backendUrl}/api/users/me/profile-image`, {
        method: "GET",
        headers: {
            "X-Auth-User-Id": user.id,
            "X-Auth-User-Email": user.email,
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
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/api/users/me/profile-image`, {
        method: "POST",
        headers: {
            "X-Auth-User-Id": user.id,
            "X-Auth-User-Email": user.email,
        },
        body: formData,
    });

    const body = await response.json().catch(() => ({ message: "Profile image upload failed" }));
    return NextResponse.json(body, { status: response.status });
};
