import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";

export interface IssuedTicketCardData {
    id?: string;
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
}
