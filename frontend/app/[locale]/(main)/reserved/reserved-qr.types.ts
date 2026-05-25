export type QrTokenResponse = {
    token: string;
    expiresAt: string;
};

export type QrTokenTerminalCode = "ALREADY_USED" | "NOT_OPEN" | "EXPIRED";

export type QrTokenErrorResponse = {
    code?: QrTokenTerminalCode;
    message?: string;
};
