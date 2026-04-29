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
    onScan,
}: IssuedTicketCardProps) => {
    const progressPct = Math.round((ticket.issuedCount / ticket.totalCount) * 100);

    return (
        <TicketShell
            badgeLabel={statusLabel}
            badgeVariant={badgeVariant}
            title={ticket.name}
            venue={
                <span className="flex min-w-0 flex-col gap-0.5">
                    {ticket.googleMapsUrl ? (
                        <a
                            className="truncate font-semibold text-primary underline-offset-2 hover:underline"
                            href={ticket.googleMapsUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {ticket.venue}
                        </a>
                    ) : (
                        <span className="truncate font-semibold">{ticket.venue}</span>
                    )}
                    {ticket.detailAddress ? (
                        <span className="truncate text-[11px] text-[var(--text-muted)]">{ticket.detailAddress}</span>
                    ) : null}
                </span>
            }
            validDate={ticket.validDate}
            media={
                <div className="relative h-[158px] w-full overflow-hidden">
                    {ticket.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ticket.imageUrl} alt={ticket.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full bg-[var(--surface-muted)]" />
                    )}
                </div>
            }
            topActions={
                <>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-primary hover:text-primary"
                        aria-label={editLabel}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        {editLabel}
                    </button>

                    {canScan && (
                        <button
                            onClick={onScan}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
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
                    <span className="text-xs text-[var(--text-muted)]">{issuedCountLabel}</span>
                    <span className="text-xs font-semibold text-primary">
                        {ticket.issuedCount} / {ticket.totalCount}
                    </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
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
