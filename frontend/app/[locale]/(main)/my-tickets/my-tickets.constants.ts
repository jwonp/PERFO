import type { IssueStatusBadgeMap, TicketForm } from "./my-tickets.types";

export const EMPTY_FORM: TicketForm = {
    name: "",
    venue: "",
    googlePlaceId: "",
    detailAddress: "",
    validDate: "",
    openAt: "",
    totalCount: "",
    allowDuplicate: false,
    maxPerUser: "1",
    discoveryMode: "LISTED",
    status: "INACTIVE",
    imageKey: undefined,
    imageUrl: undefined,
    imageFile: null,
};

export const STATUS_BADGE_STYLE: IssueStatusBadgeMap = {
    ISSUING: "success",
    INACTIVE: "neutral",
    EXPIRED: "danger",
    VERIFYING: "info",
};
