import type { TicketUsageStatus } from "@/components/tickets/TicketCard";

export type TicketingStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "SOLD_OUT" | "DUPLICATE";

export interface Ticket {
    id: string;
    name: string;
    ticketNumber: number;
    totalCount: number;
    venue: string;
    validDate: string;
    ticketingStatus: TicketingStatus;
    usageStatus: TicketUsageStatus;
    imageUrl?: string;
}
