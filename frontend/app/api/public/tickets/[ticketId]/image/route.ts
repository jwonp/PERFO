import { NextResponse } from "next/server";

type ParamsContext = {
    params: Promise<{ ticketId: string }>;
};

export async function GET(_request: Request, context: ParamsContext) {
    const { ticketId } = await context.params;
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured." }, { status: 500 });
    }

    const upstream = await fetch(`${backendUrl}/api/public/tickets/${ticketId}/image`, {
        method: "GET",
        cache: "no-store",
    });

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
        status: upstream.status,
        headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
            "Cache-Control": upstream.headers.get("Cache-Control") ?? "no-store",
        },
    });
}
