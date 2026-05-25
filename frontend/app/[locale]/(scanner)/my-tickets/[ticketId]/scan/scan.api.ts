import type { ValidationResponse } from "./scan.types";

export const validateTicketQr = async (
    ticketId: string,
    qrToken: string,
): Promise<ValidationResponse> => {
    const response = await fetch(`/api/tickets/${ticketId}/validations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ qrToken }),
    });

    return (await response.json().catch(() => ({}))) as ValidationResponse;
};
