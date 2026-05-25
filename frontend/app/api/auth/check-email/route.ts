import { NextResponse } from "next/server";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";
import { proxyPublicBackendJsonRoute, requirePublicBackendRouteClient } from "@/lib/server/backend-proxy/backend-public-route";

export const GET = async (request: Request) => {
  const client = requirePublicBackendRouteClient();
  if (!client.ok) {
    return client.response;
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  return proxyPublicBackendJsonRoute(
    client.value,
    `/api/auth/check-email?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      cache: "no-store",
    },
    { message: EMAIL_LOOKUP_FAILED_MESSAGE },
  );
};
