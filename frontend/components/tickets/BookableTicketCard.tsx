"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ImageOff, Sparkles } from "lucide-react";

import TicketShell from "@/components/tickets/ticket-shell";
import type { TicketBadgeVariant } from "@/components/tickets/ticket-shell.types";

export type BookableTicketCardData = {
    id: string;
    name: string;
    venue: string;
    detailAddress?: string;
    validDate: string;
    imageUrl?: string;
    remainingQuantity: number;
    totalQuantity: number;
    discoveryMode: "LISTED" | "LINK_ONLY";
};

type BookableTicketCardProps = {
    ticket: BookableTicketCardData;
    statusLabel: string;
    badgeVariant: TicketBadgeVariant;
    remainingLabel: string;
    linkOnlyLabel?: string;
    showLinkOnlyChip?: boolean;
    showValidDateRow?: boolean;
    footer?: ReactNode;
    children?: ReactNode;
    className?: string;
};

const BookableTicketCard = ({
    ticket,
    statusLabel,
    badgeVariant,
    remainingLabel,
    linkOnlyLabel,
    showLinkOnlyChip = true,
    showValidDateRow = true,
    footer,
    children,
    className,
}: BookableTicketCardProps) => {
    const progressPct = ticket.totalQuantity > 0
        ? Math.round((ticket.remainingQuantity / ticket.totalQuantity) * 100)
        : 0;
    const [imageUnavailable, setImageUnavailable] = useState(false);

    useEffect(() => {
        setImageUnavailable(false);
    }, [ticket.id, ticket.imageUrl]);

    return (
        <TicketShell
            badgeLabel={statusLabel}
            badgeVariant={badgeVariant}
            title={ticket.name}
            venue={
                <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">{ticket.venue}</span>
                    {ticket.detailAddress ? (
                        <span className="truncate text-[11px] text-[var(--text-muted)]">{ticket.detailAddress}</span>
                    ) : null}
                    {showLinkOnlyChip && ticket.discoveryMode === "LINK_ONLY" && linkOnlyLabel ? (
                        <span className="mt-1 inline-flex w-fit rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text-muted)]">
                            {linkOnlyLabel}
                        </span>
                    ) : null}
                </span>
            }
            validDate={ticket.validDate}
            showValidDateRow={showValidDateRow}
            footer={footer}
            className={className}
            media={
                <div className="relative h-[178px] w-full overflow-hidden bg-[linear-gradient(135deg,rgba(16,55,131,0.18),rgba(155,175,217,0.12)_55%,rgba(255,255,255,0.82))]">
                    {ticket.imageUrl && !imageUnavailable ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={ticket.imageUrl}
                            alt={ticket.name}
                            className="h-full w-full object-cover"
                            onError={() => setImageUnavailable(true)}
                        />
                    ) : (
                        <div className="flex h-full w-full items-end justify-between bg-[linear-gradient(180deg,rgba(16,55,131,0.04),rgba(16,55,131,0.16))] p-5">
                            <div className="space-y-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary shadow-sm backdrop-blur">
                                    <Sparkles className="h-3 w-3" />
                                    PERFO Ticket
                                </span>
                                <p className="max-w-[220px] text-sm font-semibold leading-tight text-primary">
                                    Ticket preview
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Cover image unavailable
                                </p>
                            </div>
                            <div className="rounded-2xl border border-white/70 bg-white/78 p-3 text-primary shadow-sm backdrop-blur">
                                <ImageOff className="h-5 w-5" />
                            </div>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-3">
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)]">{remainingLabel}</span>
                        <span className="text-xs font-semibold text-primary">
                            {ticket.remainingQuantity} / {ticket.totalQuantity}
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
                {children}
            </div>
        </TicketShell>
    );
};

export default BookableTicketCard;
export { BookableTicketCard };
