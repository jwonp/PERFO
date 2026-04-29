import type { IssueStatusBadgeMap, TicketForm } from "./my-tickets.types";

export const EMPTY_FORM: TicketForm = {
    name: "",
    venue: "",
    googlePlaceId: "",
    detailAddress: "",
    validDate: "",
    totalCount: "",
    allowDuplicate: false,
    maxPerUser: "1",
};

export const STATUS_BADGE_STYLE: IssueStatusBadgeMap = {
    ISSUING: "success",
    INACTIVE: "neutral",
    EXPIRED: "danger",
    VERIFYING: "info",
};
