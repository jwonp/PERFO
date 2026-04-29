import type { TicketUsageStatus } from "@/components/tickets/TicketCard";

export interface TokenSwatchData {
  name: string;
  variable: string;
  role: string;
}

export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export type TokenSwatchProps = TokenSwatchData;

export interface SampleTicket {
  title: string;
  venue: string;
  validDate: string;
  ticketNumber: number;
  totalCount: number;
  usageStatus: TicketUsageStatus;
  imageUrl: string;
}

export interface IssuedTicketSample {
  name: string;
  venue: string;
  validDate: string;
  status: string;
  issuedCount: number;
  totalCount: number;
}
