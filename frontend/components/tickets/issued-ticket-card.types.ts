import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";

export interface IssuedTicketCardData {
    name: string;
    venue: string;
    validDate: string;
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
}
