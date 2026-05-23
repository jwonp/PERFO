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
