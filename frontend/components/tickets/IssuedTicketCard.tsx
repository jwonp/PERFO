"use client";

import { Pencil, ScanLine } from "lucide-react";

import TicketShell from "@/components/tickets/ticket-shell";
import type { IssuedTicketCardProps } from "@/components/tickets/issued-ticket-card.types";

const IssuedTicketCard = ({
    ticket,
    statusLabel,
    badgeVariant,
    issuedCountLabel,
    editLabel,
    scanLabel,
    canScan,
    onEdit,
}: IssuedTicketCardProps) => {
    const progressPct = Math.round((ticket.issuedCount / ticket.totalCount) * 100);

    return (
        <TicketShell
            badgeLabel={statusLabel}
            badgeVariant={badgeVariant}
            title={ticket.name}
            venue={ticket.venue}
            validDate={ticket.validDate}
            media={
                <div className="relative h-[158px] w-full overflow-hidden">
                    {ticket.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ticket.imageUrl} alt={ticket.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-perfo-secondary/20" />
                    )}
                </div>
            }
            topActions={
                <>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1 rounded-md border border-perfo-secondary/30 px-2 py-1 text-xs font-medium text-perfo-secondary transition-colors hover:border-perfo-primary hover:text-perfo-primary"
                        aria-label={editLabel}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        {editLabel}
                    </button>

                    {canScan && (
                        <button
                            className="flex items-center gap-1.5 rounded-md bg-perfo-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-perfo-primary-hover"
                            aria-label={scanLabel}
                        >
                            <ScanLine className="h-4 w-4" />
                            {scanLabel}
                        </button>
                    )}
                </>
            }
        >
            <div>
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-perfo-text/50">{issuedCountLabel}</span>
                    <span className="text-xs font-semibold text-perfo-primary">
                        {ticket.issuedCount} / {ticket.totalCount}
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-perfo-secondary/20">
                    <div
                        className="h-full rounded-full bg-perfo-primary transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>
        </TicketShell>
    );
};

export default IssuedTicketCard;
export { IssuedTicketCard };
export type { IssuedTicketCardData, IssuedTicketCardProps } from "@/components/tickets/issued-ticket-card.types";
