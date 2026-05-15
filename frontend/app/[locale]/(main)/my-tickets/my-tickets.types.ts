import type { useTranslations } from "next-intl";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell";

export type IssueStatus = "ISSUING" | "INACTIVE" | "EXPIRED" | "VERIFYING";
export type DuplicatePurchaseFilter = "ALL" | "ALLOW_DUPLICATE" | "NO_DUPLICATE";
export type DiscoveryMode = "LISTED" | "LINK_ONLY";

export interface IssuedTicket {
    id: string;
    eventId?: string;
    name: string;
    venue: string;
    detailAddress: string;
    googleMapsUrl?: string;
    googlePlaceId?: string;
    validDate: string;
    openAt: string;
    imageKey?: string;
    imageUrl?: string;
    status: IssueStatus;
    issuedCount: number;
    totalCount: number;
    allowDuplicate: boolean;
    maxPerUser: number;
    discoveryMode: DiscoveryMode;
    publicBookingPath?: string;
    publicBookingUrl?: string;
}

export interface TicketForm {
    name: string;
    venue: string;
    googlePlaceId: string;
    detailAddress: string;
    validDate: string;
    openAt: string;
    totalCount: string;
    allowDuplicate: boolean;
    maxPerUser: string;
    discoveryMode: DiscoveryMode;
    status: IssueStatus;
    imageKey?: string;
    imageUrl?: string;
    imageFile?: File | null;
}

export interface TicketFormSheetProps {
    open: boolean;
    editTarget: IssuedTicket | null;
    onClose: () => void;
    onSubmit: (form: TicketForm) => Promise<void> | void;
    t: ReturnType<typeof useTranslations>;
}

export type IssueStatusBadgeMap = Record<IssueStatus, TicketBadgeVariant>;
