import type { useTranslations } from "next-intl";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell";

export type IssueStatus = "ISSUING" | "INACTIVE" | "EXPIRED" | "VERIFYING";

export interface IssuedTicket {
    id: string;
    name: string;
    venue: string;
    detailAddress: string;
    googleMapsUrl?: string;
    googlePlaceId?: string;
    validDate: string;
    imageUrl?: string;
    status: IssueStatus;
    issuedCount: number;
    totalCount: number;
    allowDuplicate: boolean;
    maxPerUser: number;
}

export interface TicketForm {
    name: string;
    venue: string;
    googlePlaceId: string;
    detailAddress: string;
    validDate: string;
    totalCount: string;
    allowDuplicate: boolean;
    maxPerUser: string;
}

export interface TicketFormSheetProps {
    open: boolean;
    editTarget: IssuedTicket | null;
    onClose: () => void;
    onSubmit: (form: TicketForm) => Promise<void> | void;
    t: ReturnType<typeof useTranslations>;
}

export type IssueStatusBadgeMap = Record<IssueStatus, TicketBadgeVariant>;
