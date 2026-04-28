import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";

const backendUrl = process.env.BACKEND_URL;

export const POST = async (request: Request) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "Unauthorized" },
            { status: 401 }
        );
    }

    if (!backendUrl) {
        return NextResponse.json(
            { message: "BACKEND_URL is not configured" },
            { status: 500 }
        );
    }

    const payload = await request.json();
    const response = await fetch(`${backendUrl}/api/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

    if (!response.ok) {
        return NextResponse.json(
            { message: body.message ?? "Ticket creation failed" },
            { status: response.status }
        );
    }

    return NextResponse.json(body, { status: 200 });
};
