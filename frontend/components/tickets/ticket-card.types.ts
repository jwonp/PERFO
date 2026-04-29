export type TicketUsageStatus = "BEFORE_USE" | "WAITING" | "MY_TURN" | "USED";

export interface TicketCardProps {
    name: string;
    venue: string;
    validDate: string;
    imageUrl?: string;
    usageStatus: TicketUsageStatus;
    ticketNumber: number;
    totalCount: number;
    qrActionLabel?: string;
    qrActionHref?: string;
}
