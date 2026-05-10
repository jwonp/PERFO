import { NextResponse } from "next/server";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";

const backendUrl = process.env.BACKEND_URL;

export const GET = async (request: Request) => {
  if (!backendUrl) {
    return NextResponse.json(
      { message: "BACKEND_URL is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  const response = await fetch(
    `${backendUrl}/api/auth/check-email?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const body = await response
    .json()
    .catch(() => ({ message: EMAIL_LOOKUP_FAILED_MESSAGE }));
  return NextResponse.json(body, { status: response.status });
};
