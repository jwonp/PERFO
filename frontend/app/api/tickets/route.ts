import { NextResponse } from "next/server";
import { requireBackendProxyClient } from "@/lib/server/backend-proxy/backend-proxy-client";
import { jsonFromBackendResponse, parseBackendResponse } from "@/lib/server/backend-proxy/backend-proxy-response";
import { requireSessionUser } from "@/lib/server/backend-proxy/backend-proxy-session";

export const GET = async () => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser.response;
    }

    const proxyClient = requireBackendProxyClient(sessionUser.value, ["tickets"]);
    if (!proxyClient.ok) {
        return proxyClient.response;
    }

    const response = await fetch(`${proxyClient.value.backendUrl}/api/tickets?ownerUserId=${encodeURIComponent(sessionUser.value.id)}`, {
        method: "GET",
        headers: proxyClient.value.authHeaders,
        cache: "no-store",
    });

    return jsonFromBackendResponse(response, []);
};

export const POST = async (request: Request) => {
    const sessionUser = await requireSessionUser();
    if (!sessionUser.ok) {
        return sessionUser.response;
    }

    const proxyClient = requireBackendProxyClient(sessionUser.value, ["tickets"]);
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
                    ownerUserId: sessionUser.value.id,
                }),
            ], { type: "application/json" }),
            "payload.json",
        );

        const file = formData.get("file");
        if (file instanceof File && file.size > 0) {
            backendFormData.set("file", file, file.name);
        }

        response = await fetch(`${proxyClient.value.backendUrl}/api/tickets`, {
            method: "POST",
            headers: proxyClient.value.authHeaders,
            body: backendFormData,
        });
    } else {
        const payload = await request.json();
        response = await fetch(`${proxyClient.value.backendUrl}/api/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...proxyClient.value.authHeaders,
            },
            body: JSON.stringify({
                ...payload,
                ownerUserId: sessionUser.value.id,
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
