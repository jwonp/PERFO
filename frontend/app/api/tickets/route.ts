import { NextResponse } from "next/server";
import { parseBackendResponse } from "@/lib/server/backend-proxy/backend-proxy-response";
import { fetchBackendRoute, proxyBackendJsonRoute, requireBackendRouteClient } from "@/lib/server/backend-proxy/backend-proxy-route";

export const GET = async () => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    return proxyBackendJsonRoute(
        proxyClient.value,
        `/api/tickets?ownerUserId=${encodeURIComponent(proxyClient.value.sessionUser.id)}`,
        {
            method: "GET",
            cache: "no-store",
        },
        [],
    );
};

export const POST = async (request: Request) => {
    const proxyClient = await requireBackendRouteClient(["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const contentType = request.headers.get("content-type") ?? "";

    let response: Response;
    if (!contentType.includes("application/json")) {
        const formData = await request.formData();
        const payloadPart = formData.get("payload");
        if (payloadPart == null) {
            return NextResponse.json(
                { message: "payload is required" },
                { status: 400 }
            );
        }

        const payloadText = typeof payloadPart === "string" ? payloadPart : await payloadPart.text();

        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(payloadText) as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { message: "Invalid payload" },
                { status: 400 }
            );
        }

        const backendFormData = new FormData();
        backendFormData.set(
            "payload",
            new Blob([
                JSON.stringify({
                    ...payload,
                    ownerUserId: proxyClient.value.sessionUser.id,
                }),
            ], { type: "application/json" }),
            "payload.json",
        );

        const file = formData.get("file");
        if (file instanceof File && file.size > 0) {
            backendFormData.set("file", file, file.name);
        }

        response = await fetchBackendRoute(proxyClient.value, "/api/tickets", {
            method: "POST",
            body: backendFormData,
        });
    } else {
        const payload = await request.json();
        response = await fetchBackendRoute(proxyClient.value, "/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
                ownerUserId: proxyClient.value.sessionUser.id,
            }),
        });
    }

    const body = await parseBackendResponse(response, {});
    const message = (
        typeof body === "object"
        && body !== null
        && "message" in body
        && typeof body.message === "string"
    )
        ? body.message
        : "Ticket creation failed";

    if (!response.ok) {
        return NextResponse.json(
            { message },
            { status: response.status }
        );
    }

    return NextResponse.json(body, { status: 200 });
};
