import type { IssuedTicket, IssueStatusBadgeMap, TicketForm } from "./my-tickets.types";

export const INITIAL_MOCK: IssuedTicket[] = [
    {
        id: "1",
        name: "PERFO Summer Festival",
        venue: "올림픽공원 체조경기장",
        validDate: "2026-08-15",
        imageUrl: "https://picsum.photos/seed/concert1/600/300",
        status: "ISSUING",
        issuedCount: 342,
        totalCount: 500,
        allowDuplicate: false,
        maxPerUser: 1,
    },
    {
        id: "2",
        name: "Jazz Night Live",
        venue: "블루스퀘어 마스터카드홀",
        validDate: "2026-07-20",
        imageUrl: "https://picsum.photos/seed/jazz2/600/300",
        status: "VERIFYING",
        issuedCount: 150,
        totalCount: 150,
        allowDuplicate: false,
        maxPerUser: 1,
    },
    {
        id: "3",
        name: "Art Exhibition 2026",
        venue: "국립현대미술관",
        validDate: "2026-06-01",
        imageUrl: "https://picsum.photos/seed/art3/600/300",
        status: "INACTIVE",
        issuedCount: 0,
        totalCount: 200,
        allowDuplicate: true,
        maxPerUser: 2,
    },
    {
        id: "4",
        name: "Winter Concert Series",
        venue: "예술의전당 콘서트홀",
        validDate: "2025-12-31",
        imageUrl: "https://picsum.photos/seed/kpop4/600/300",
        status: "EXPIRED",
        issuedCount: 80,
        totalCount: 100,
        allowDuplicate: false,
        maxPerUser: 1,
    },
];

export const EMPTY_FORM: TicketForm = {
    name: "",
    venue: "",
    googlePlaceId: "",
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
