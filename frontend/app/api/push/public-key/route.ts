import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async () => NextResponse.json(
    {
        success: true,
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    },
    {
        headers: {
            "Cache-Control": "no-store",
        },
    },
);
