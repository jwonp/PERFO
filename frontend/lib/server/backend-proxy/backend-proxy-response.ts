import { NextResponse } from "next/server";
import { parseBackendResponseText } from "./backend-proxy.func";

export const parseBackendResponse = async <TFallback>(
    response: Response,
    fallbackBody: TFallback,
) => parseBackendResponseText(await response.text(), fallbackBody);

export const jsonFromBackendResponse = async <TFallback>(
    response: Response,
    fallbackBody: TFallback,
) =>
    NextResponse.json(
        await parseBackendResponse(response, fallbackBody),
        { status: response.status },
    );

export const binaryFromBackendResponse = async (
    response: Response,
    fallbackContentType = "application/octet-stream",
    fallbackCacheControl = "private, no-store",
) => {
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
        status: response.status,
        headers: {
            "Content-Type": response.headers.get("Content-Type") ?? fallbackContentType,
            "Cache-Control": response.headers.get("Cache-Control") ?? fallbackCacheControl,
        },
    });
};
