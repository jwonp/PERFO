"use client";

import { QrCode } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { TICKET_STATUS_META } from "@/components/tickets/ticket-card.constants";
import TicketShell from "@/components/tickets/ticket-shell";
import type { TicketCardProps, TicketUsageStatus } from "@/components/tickets/ticket-card.types";

const TicketCard = ({
    name,
    venue,
    validDate,
    imageUrl,
    usageStatus,
    ticketNumber,
    totalCount,
    qrActionLabel,
    qrActionHref,
}: TicketCardProps) => {
    const meta = TICKET_STATUS_META[usageStatus];
    const isNowServing = usageStatus === "MY_TURN";
    const isExpired = usageStatus === "USED";

    return (
        <TicketShell
            badgeLabel={meta.label}
            badgeVariant={meta.badge}
            title={name}
            venue={venue}
            validDate={
                <>
                    {validDate} {meta.dateSuffix}
                </>
            }
            media={
                <div className="relative h-[158px] w-full overflow-hidden">
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageUrl}
                            alt={name}
                            className={`h-full w-full object-cover ${isExpired ? "grayscale opacity-60" : ""}`}
                        />
                    ) : (
                        <div className="h-full w-full bg-[var(--surface-muted)]" />
                    )}
                </div>
            }
            footer={
                isNowServing ? (
                    qrActionHref ? (
                        <Button asChild className="h-11 w-full rounded-md">
                            <Link href={qrActionHref}>
                                <QrCode className="h-4 w-4" />
                                {qrActionLabel ?? "QR 표시"}
                            </Link>
                        </Button>
                    ) : (
                        <Button className="h-11 w-full rounded-md" disabled>
                            <QrCode className="h-4 w-4" />
                            {qrActionLabel ?? "QR 표시"}
                        </Button>
                    )
                ) : undefined
            }
        >
            <div className="pt-1">
                <div className="flex justify-end pt-1">
                    <span className="text-sm font-semibold text-primary">
                        {ticketNumber}{" "}
                        <span className="font-normal text-[var(--text-subtle)]">/ {totalCount}</span>
                    </span>
                </div>
            </div>
        </TicketShell>
    );
};

export default TicketCard;
export { TicketCard };
export type { TicketCardProps, TicketUsageStatus };
