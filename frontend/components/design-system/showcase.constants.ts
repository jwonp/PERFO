import type { IssuedTicketSample, SampleTicket, TokenSwatchData } from "./showcase.types";

export const COLOR_TOKENS: TokenSwatchData[] = [
  { name: "Primary", variable: "--primary", role: "Primary action and active states" },
  { name: "Secondary", variable: "--secondary", role: "Support surface and secondary action" },
  { name: "Accent", variable: "--accent", role: "Warm highlight and urgency support" },
  { name: "Surface", variable: "--surface", role: "Base panel background" },
  { name: "Surface Raised", variable: "--surface-raised", role: "Pinned controls and focus panels" },
  { name: "Success", variable: "--success", role: "Confirmed inventory or action success" },
  { name: "Warning", variable: "--warning", role: "Queue risk, timing pressure" },
  { name: "Danger", variable: "--danger", role: "Failed state or destructive action" },
];

export const SPACING_TOKENS = ["4px", "8px", "12px", "16px", "20px", "24px", "32px", "40px"];

export const SAMPLE_TICKETS: SampleTicket[] = [
  {
    title: "Hamilton Seoul",
    venue: "Seoul Arts Center",
    validDate: "2026.04.21",
    ticketNumber: 42,
    totalCount: 500,
    usageStatus: "MY_TURN",
    imageUrl: "https://picsum.photos/seed/perfo-hamilton/600/300",
  },
  {
    title: "Phantom 2026",
    venue: "Blue Square",
    validDate: "2026.05.10",
    ticketNumber: 118,
    totalCount: 300,
    usageStatus: "WAITING",
    imageUrl: "https://picsum.photos/seed/perfo-phantom/600/300",
  },
  {
    title: "Wicked Encore",
    venue: "KSPO Dome",
    validDate: "2026.06.01",
    ticketNumber: 5,
    totalCount: 200,
    usageStatus: "BEFORE_USE",
    imageUrl: "https://picsum.photos/seed/perfo-wicked/600/300",
  },
];

export const ISSUED_TICKET_SAMPLE: IssuedTicketSample = {
  name: "PERFO Summer Festival",
  venue: "Olympic Park Gymnastics Arena",
  validDate: "2026-08-15",
  status: "ISSUING",
  issuedCount: 342,
  totalCount: 500,
};
