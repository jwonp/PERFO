import { createHmac, randomUUID } from "node:crypto";

const DEFAULT_ISSUER = "perfo-frontend";
const DEFAULT_AUDIENCE = "perfo-backend-ticketing";
const DEFAULT_TTL_SECONDS = 30;

type InternalApiJwtPayload = {
    userId: string;
    email?: string | null;
    scopes: string[];
};

const base64UrlEncode = (value: string) => {
    return Buffer.from(value, "utf8").toString("base64url");
};

export const createInternalApiJwt = ({
    userId,
    email,
    scopes,
}: InternalApiJwtPayload) => {
    const activeKid = process.env.INTERNAL_API_JWT_ACTIVE_KID;
    const activeSecret = process.env.INTERNAL_API_JWT_ACTIVE_SECRET;
    const issuer = process.env.INTERNAL_API_JWT_ISSUER ?? DEFAULT_ISSUER;
    const audience = process.env.INTERNAL_API_JWT_AUDIENCE ?? DEFAULT_AUDIENCE;
    const ttlSeconds = Number(process.env.INTERNAL_API_JWT_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

    if (!activeKid || !activeSecret) {
        throw new Error("Internal API JWT signing config is missing");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = {
        alg: "HS256",
        typ: "JWT",
        kid: activeKid,
    };
    const payload = {
        iss: issuer,
        aud: audience,
        sub: "ticketing-proxy",
        iat: now,
        nbf: now - 1,
        exp: now + ttlSeconds,
        jti: randomUUID(),
        uid: Number(userId),
        scope: scopes,
        ...(email ? { email } : {}),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac("sha256", activeSecret)
        .update(unsignedToken)
        .digest("base64url");

    return `${unsignedToken}.${signature}`;
};
