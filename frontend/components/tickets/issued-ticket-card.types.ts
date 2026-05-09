import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";

export interface IssuedTicketCardData {
    id?: string;
    eventId?: string;
    name: string;
    venue: string;
    detailAddress?: string;
    googleMapsUrl?: string;
    googlePlaceId?: string;
    validDate: string;
    imageUrl?: string;
    status: string;
    issuedCount: number;
    totalCount: number;
    discoveryMode?: "LISTED" | "LINK_ONLY";
}

export interface IssuedTicketCardProps {
    ticket: IssuedTicketCardData;
    statusLabel: string;
    badgeVariant: TicketBadgeVariant;
    issuedCountLabel: string;
    editLabel: string;
    scanLabel: string;
    canScan: boolean;
    onEdit: () => void;
    onScan?: () => void;
    scanHref?: string;
    linkOnlyLabel?: string;
}
