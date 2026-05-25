import type { useTranslations } from "next-intl";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell";
import type { NotificationSyncTicket } from "@/lib/notifications/notification.types";

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

export interface TicketBasePayload {
    name: string;
    venue: string;
    googlePlaceId: string;
    detailAddress: string;
    validDate: string;
    openAt: string | null;
    totalCount: number;
    allowDuplicate: boolean;
    maxPerUser: number;
    discoveryMode: DiscoveryMode;
}

export interface TicketUpdatePayload extends TicketBasePayload {
    status: IssueStatus;
    imageKey: string | null;
}

export interface TicketFormSheetProps {
    open: boolean;
    editTarget: IssuedTicket | null;
    onClose: () => void;
    onSubmit: (form: TicketForm) => Promise<void> | void;
    t: ReturnType<typeof useTranslations>;
}

export interface TicketFilterTabsProps {
    duplicateFilter: DuplicatePurchaseFilter;
    onChange: (filter: DuplicatePurchaseFilter) => void;
    t: ReturnType<typeof useTranslations>;
}

export interface TicketListProps {
    filteredTickets: IssuedTicket[];
    hasLoadedTickets: boolean;
    locale: string;
    copiedTicketId: string | null;
    canShareBookingUrl: boolean;
    emptyStateTitle: string;
    onEdit: (ticket: IssuedTicket) => void;
    onCopyBookingUrl: (ticket: IssuedTicket) => Promise<void>;
    onShareBookingUrl: (ticket: IssuedTicket) => Promise<void>;
    t: ReturnType<typeof useTranslations>;
}

export interface MyTicketsScreenProps extends TicketListProps {
    sheetOpen: boolean;
    editTarget: IssuedTicket | null;
    duplicateFilter: DuplicatePurchaseFilter;
    onOpenCreate: () => void;
    onCloseSheet: () => void;
    onChangeFilter: (filter: DuplicatePurchaseFilter) => void;
    onSubmit: (form: TicketForm) => Promise<void>;
}

export type IssueStatusBadgeMap = Record<IssueStatus, TicketBadgeVariant>;
export type IssueStatusOption = {
    value: IssueStatus;
    labelKey: string;
};

export interface MyTicketsControllerArgs {
    locale: string;
    t: ReturnType<typeof useTranslations>;
}

export interface MyTicketsControllerResult {
    filteredTickets: IssuedTicket[];
    hasLoadedTickets: boolean;
    sheetOpen: boolean;
    editTarget: IssuedTicket | null;
    duplicateFilter: DuplicatePurchaseFilter;
    copiedTicketId: string | null;
    canShareBookingUrl: boolean;
    emptyStateTitle: string;
    openCreate: () => void;
    openEdit: (ticket: IssuedTicket) => void;
    handleClose: () => void;
    setDuplicateFilter: (filter: DuplicatePurchaseFilter) => void;
    handleSubmit: (form: TicketForm) => Promise<void>;
    handleCopyBookingUrl: (ticket: IssuedTicket) => Promise<void>;
    handleShareBookingUrl: (ticket: IssuedTicket) => Promise<void>;
}

export type MyTicketsNotificationSnapshot = NotificationSyncTicket;
