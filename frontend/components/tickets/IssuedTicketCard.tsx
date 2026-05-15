"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ImageOff, Pencil, ScanLine, Share2, Sparkles } from "lucide-react";

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
    scanHref,
    linkOnlyLabel,
    copyBookingUrlLabel,
    shareBookingUrlLabel,
    copySuccessMessage,
    canShareBookingUrl,
    onCopyBookingUrl,
    onShareBookingUrl,
}: IssuedTicketCardProps) => {
    const progressPct = Math.round((ticket.issuedCount / ticket.totalCount) * 100);
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
                    {ticket.discoveryMode === "LINK_ONLY" && linkOnlyLabel ? (
                        <span className="mt-1 inline-flex w-fit rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--text-muted)]">
                            {linkOnlyLabel}
                        </span>
                    ) : null}
                </span>
            }
            validDate={ticket.validDate}
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

                    {canScan && scanHref ? (
                        <Link
                            href={scanHref}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
                            aria-label={scanLabel}
                        >
                            <ScanLine className="h-4 w-4" />
                            {scanLabel}
                        </Link>
                    ) : null}

                    {canScan && !scanHref ? (
                        <button
                            type="button"
                            onClick={onScan}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
                            aria-label={scanLabel}
                        >
                            <ScanLine className="h-4 w-4" />
                            {scanLabel}
                        </button>
                    ) : null}
                </>
            }
        >
            <div className="space-y-3">
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
                {onCopyBookingUrl ? (
                    <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-[var(--text)] transition-colors hover:border-primary hover:text-primary"
                                onClick={onCopyBookingUrl}
                            >
                                <Copy className="h-3.5 w-3.5" />
                                {copyBookingUrlLabel}
                            </button>
                            {canShareBookingUrl && onShareBookingUrl && shareBookingUrlLabel ? (
                                <button
                                    type="button"
                                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]"
                                    onClick={onShareBookingUrl}
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    {shareBookingUrlLabel}
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>
                        {copySuccessMessage ? (
                            <p className="text-xs font-medium text-primary">{copySuccessMessage}</p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </TicketShell>
    );
};

export default IssuedTicketCard;
export { IssuedTicketCard };
export type { IssuedTicketCardData, IssuedTicketCardProps } from "@/components/tickets/issued-ticket-card.types";
