import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL;

export const POST = async (request: Request) => {
  if (!backendUrl) {
    return NextResponse.json(
      { message: "BACKEND_URL is not configured" },
      { status: 500 },
    );
  }

  const payload = await request.json();
  const response = await fetch(
    `${backendUrl}/api/auth/verification-codes/request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  const body = await response
    .json()
    .catch(() => ({ message: "Verification code request failed" }));
  return NextResponse.json(body, { status: response.status });
};
