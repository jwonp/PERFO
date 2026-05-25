import type * as React from "react";

export type TicketBadgeVariant = "info" | "warning" | "success" | "neutral" | "danger";

export interface TicketShellProps {
    badgeLabel: React.ReactNode;
    badgeVariant: TicketBadgeVariant;
    title: React.ReactNode;
    venue: React.ReactNode;
    validDate: React.ReactNode;
    showValidDateRow?: boolean;
    topActions?: React.ReactNode;
    footer?: React.ReactNode;
    media?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}
