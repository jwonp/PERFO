import { buildCreateTicketPayload, buildTicketPayload } from "./my-tickets.func";
import type { TicketForm } from "./my-tickets.types";

const parseJsonBody = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
    const body = await response.json().catch(() => ({ message: fallbackMessage }));

    if (!response.ok) {
        const message =
            typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof body.message === "string"
                ? body.message
                : fallbackMessage;

        throw new Error(message);
    }

    return body as T;
};

export const fetchIssuedTickets = async (): Promise<Array<Record<string, unknown>>> => {
    const response = await fetch("/api/tickets", { cache: "no-store" });
    return parseJsonBody<Array<Record<string, unknown>>>(response, "Request failed");
};

export const createIssuedTicket = async (
    form: TicketForm,
    defaultErrorMessage: string,
): Promise<Record<string, unknown>> => {
    const createPayload = buildCreateTicketPayload(form);

    if (form.imageFile) {
        const formData = new FormData();
        formData.set(
            "payload",
            new Blob([JSON.stringify(createPayload)], { type: "application/json" }),
            "payload.json",
        );
        formData.set("file", form.imageFile);

        const response = await fetch("/api/tickets", {
            method: "POST",
            body: formData,
        });

        return parseJsonBody<Record<string, unknown>>(response, defaultErrorMessage);
    }

    const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(createPayload),
    });

    return parseJsonBody<Record<string, unknown>>(response, defaultErrorMessage);
};

export const updateIssuedTicket = async (
    ticketId: string,
    form: TicketForm,
    imageKey: string | null,
    defaultErrorMessage: string,
): Promise<Record<string, unknown>> => {
    const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(buildTicketPayload(form, imageKey)),
    });

    return parseJsonBody<Record<string, unknown>>(response, defaultErrorMessage);
};

export const uploadTicketImage = async (
    ticketId: string,
    file: File,
    defaultErrorMessage: string,
): Promise<{ imageKey: string; imageUrl?: string }> => {
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(`/api/tickets/${ticketId}/image`, {
        method: "POST",
        body: formData,
    });

    return parseJsonBody<{ imageKey: string; imageUrl?: string }>(response, defaultErrorMessage);
};

export const cleanupTicketImage = async (ticketId: string, imageKey: string): Promise<void> => {
    await fetch(`/api/tickets/${ticketId}/image?imageKey=${encodeURIComponent(imageKey)}`, {
        method: "DELETE",
    }).catch(() => undefined);
};
