import { NextResponse } from "next/server";
import { proxyBackendBinaryRoute, proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async (
    _request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { ticketId } = await params;
    return proxyBackendBinaryRoute(proxyClient.value, `/api/tickets/${ticketId}/image`, {
        method: "GET",
        cache: "no-store",
    });
};

export const POST = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { ticketId } = await params;
    const formData = await request.formData();
    return proxyBackendJsonRoute(proxyClient.value, `/api/tickets/${ticketId}/image`, {
        method: "POST",
        body: formData,
    }, { message: "Ticket image upload failed" });
};

export const DELETE = async (
    request: Request,
    { params }: { params: Promise<{ ticketId: string }> },
) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const { ticketId } = await params;
    const url = new URL(request.url);
    const imageKey = url.searchParams.get("imageKey");

    if (!imageKey) {
        return NextResponse.json({ message: "imageKey is required" }, { status: 400 });
    }

    const response = await fetch(
        `${proxyClient.value.backendUrl}/api/tickets/${ticketId}/image?imageKey=${encodeURIComponent(imageKey)}`,
        {
            method: "DELETE",
            headers: proxyClient.value.authHeaders,
        },
    );

    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    const body = await response.json().catch(() => ({ message: "Ticket image cleanup failed" }));
    return NextResponse.json(body, { status: response.status });
};
