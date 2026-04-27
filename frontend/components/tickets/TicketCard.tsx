"use client";

import { QrCode } from "lucide-react";

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
                <div className="relative aspect-video w-full overflow-hidden">
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageUrl}
                            alt={name}
                            className={`h-full w-full object-cover ${isExpired ? "grayscale opacity-60" : ""}`}
                        />
                    ) : (
                        <div className="h-full w-full bg-perfo-secondary/20" />
                    )}
                </div>
            }
            footer={
                isNowServing ? (
                    <Button className="h-11 w-full">
                        <QrCode className="h-4 w-4" />
                        QR 스캔
                    </Button>
                ) : undefined
            }
        >
            <div className="pt-1">
                <div className="flex justify-end pt-1">
                    <span className="text-sm font-semibold text-perfo-primary">
                        {ticketNumber}{" "}
                        <span className="text-perfo-text/30 font-normal">/ {totalCount}</span>
                    </span>
                </div>
            </div>
        </TicketShell>
    );
};

export default TicketCard;
export { TicketCard };
export type { TicketCardProps, TicketUsageStatus };
