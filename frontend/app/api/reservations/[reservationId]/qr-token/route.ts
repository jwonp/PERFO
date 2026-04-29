import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL;

export const POST = async (
    _request: Request,
    { params }: { params: Promise<{ reservationId: string }> },
) => {
    if (!backendUrl) {
        return NextResponse.json({ message: "BACKEND_URL is not configured" }, { status: 500 });
    }

    const { reservationId } = await params;
    const response = await fetch(`${backendUrl}/api/reservations/${reservationId}/qr-token`, {
        method: "POST",
    });

    const text = await response.text();
    const body = text
        ? (() => {
              try {
                  return JSON.parse(text);
              } catch {
                  return { message: text };
              }
          })()
        : {};

    return NextResponse.json(body, { status: response.status });
};
