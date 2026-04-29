"use client";

import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/lib/utils";
import type { TicketShellProps } from "@/components/tickets/ticket-shell.types";

const TicketPinIcon = () => {
    return <MapPin className="h-3 w-3 shrink-0" />;
};

const TicketCalendarIcon = () => {
    return <CalendarDays className="h-3 w-3 shrink-0" />;
};

const TicketShell = ({
    badgeLabel,
    badgeVariant,
    title,
    venue,
    validDate,
    topActions,
    footer,
    media,
    className,
    children,
}: TicketShellProps) => {
    return (
        <article className={cn("overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)] shadow-[var(--shadow-soft)]", className)}>
            {media}

            <div className="space-y-3 px-4 pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Badge variant={badgeVariant} className="mb-3 rounded-sm px-2 py-1 text-[10px]">
                            {badgeLabel}
                        </Badge>
                        <p className="line-clamp-2 text-base font-bold leading-tight text-[var(--text)]">{title}</p>
                    </div>
                    {topActions ? <div className="flex shrink-0 items-center gap-2">{topActions}</div> : null}
                </div>

                <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <TicketPinIcon />
                        {venue}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <TicketCalendarIcon />
                        {validDate}
                    </p>
                </div>

                {children}
            </div>

            {footer ? <div className="px-4 pb-4">{footer}</div> : null}
        </article>
    );
};

export default TicketShell;
export { TicketCalendarIcon, TicketPinIcon, TicketShell };
export type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";
