import { NextResponse } from "next/server";

export const buildUnauthorizedResponse = () =>
    NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export const buildBackendUrlConfigResponse = () =>
    NextResponse.json(
        { message: "BACKEND_URL is not configured" },
        { status: 500 },
    );

export const buildInternalApiJwtConfigResponse = () =>
    NextResponse.json(
        { message: "Internal API JWT signing is not configured" },
        { status: 500 },
    );

export const parseBackendResponseText = <TFallback>(
    text: string,
    fallbackBody: TFallback,
) => {
    if (!text) {
        return fallbackBody;
    }

    try {
        return JSON.parse(text) as unknown;
    } catch {
        return { message: text };
    }
};
