import { proxyPublicBackendJsonRoute, requirePublicBackendRouteClient } from "@/lib/server/backend-proxy/backend-public-route";

export const POST = async (request: Request) => {
  const client = requirePublicBackendRouteClient();
  if (!client.ok) {
    return client.response;
  }

  const payload = await request.json();
  return proxyPublicBackendJsonRoute(
    client.value,
    "/api/auth/verification-codes/request",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    { message: "Verification code request failed" },
  );
};
