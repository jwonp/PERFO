import { googleMapsSearchUrl } from "./place-utils";
import { STATUS_BADGE_STYLE } from "./my-tickets.constants";
import type {
    DiscoveryMode,
    IssuedTicket,
    IssueStatus,
    TicketBasePayload,
    TicketForm,
    TicketUpdatePayload,
} from "./my-tickets.types";

export const statusBadgeStyle = (status: IssueStatus) => STATUS_BADGE_STYLE[status];

export const toDateTimeLocalValue = (isoValue?: string): string => {
    if (!isoValue) {
        return "";
    }

    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 16);
};

export const toIsoDateTime = (localValue: string): string | null => {
    if (!localValue) {
        return null;
    }

    const date = new Date(localValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
};

export const isFutureVerifyingRequest = (
    status: IssueStatus,
    openAt: string,
    now = Date.now(),
): boolean => {
    const openAtIso = toIsoDateTime(openAt);
    if (status !== "VERIFYING" || !openAtIso) {
        return false;
    }

    return new Date(openAtIso).getTime() > now;
};

export const mapTicket = (item: Record<string, unknown>): IssuedTicket => ({
    id: String(item.id),
    name: String(item.name),
    venue: String(item.venue),
    detailAddress: String(item.detailAddress ?? ""),
    googleMapsUrl: googleMapsSearchUrl(String(item.venue), String(item.googlePlaceId)),
    googlePlaceId: String(item.googlePlaceId),
    validDate: String(item.validDate),
    openAt: String(item.openAt ?? ""),
    imageKey: item.imageKey ? String(item.imageKey) : undefined,
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    status: item.status as IssueStatus,
    issuedCount: Number(item.issuedCount ?? 0),
    totalCount: Number(item.totalCount),
    allowDuplicate: Boolean(item.allowDuplicate),
    maxPerUser: Number(item.maxPerUser),
    discoveryMode: String(item.discoveryMode ?? "LISTED") as DiscoveryMode,
    eventId: item.eventId ? String(item.eventId) : undefined,
    publicBookingPath: item.publicBookingPath ? String(item.publicBookingPath) : undefined,
    publicBookingUrl: item.publicBookingUrl ? String(item.publicBookingUrl) : undefined,
});

const buildTicketBasePayload = (form: TicketForm): TicketBasePayload => ({
    name: form.name,
    venue: form.venue,
    googlePlaceId: form.googlePlaceId,
    detailAddress: form.detailAddress,
    validDate: form.validDate,
    openAt: toIsoDateTime(form.openAt),
    totalCount: Number(form.totalCount),
    allowDuplicate: form.allowDuplicate,
    maxPerUser: Number(form.maxPerUser),
    discoveryMode: form.discoveryMode,
});

export const buildTicketPayload = (form: TicketForm, imageKey?: string | null): TicketUpdatePayload => ({
    ...buildTicketBasePayload(form),
    status: form.status,
    imageKey: imageKey ?? form.imageKey ?? null,
});

export const buildCreateTicketPayload = (form: TicketForm): TicketBasePayload => buildTicketBasePayload(form);

export const buildPublicBookingUrl = (
    ticket: IssuedTicket,
    locale: string,
    origin?: string | null,
): string | null => {
    if (ticket.publicBookingUrl) {
        return ticket.publicBookingUrl;
    }

    if (!origin || !ticket.publicBookingPath) {
        return null;
    }

    return `${origin}/${locale}${ticket.publicBookingPath}`;
};
