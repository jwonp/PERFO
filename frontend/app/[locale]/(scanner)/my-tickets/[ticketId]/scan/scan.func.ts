import { CheckCircle2, XCircle } from "lucide-react";
import type { RecentScanRecord, ResultMeta } from "./scan.types";

export const resultLabelKey = (status: string): string | null => {
    switch (status) {
        case "SUCCESS":
            return "myTickets.scanResultSuccess";
        case "ALREADY_USED":
            return "myTickets.scanResultAlreadyUsed";
        case "INVALID":
            return "myTickets.scanResultInvalid";
        case "EXPIRED":
            return "myTickets.scanResultExpired";
        case "WRONG_TICKET":
            return "myTickets.scanResultWrongTicket";
        case "NOT_OPEN":
            return "myTickets.scanResultNotOpen";
        case "FORBIDDEN":
            return "myTickets.scanResultForbidden";
        default:
            return null;
    }
};

export const resultMeta = (status: string): ResultMeta => {
    if (status === "SUCCESS") {
        return {
            badgeVariant: "success",
            icon: CheckCircle2,
            panelClassName: "border-[color:color-mix(in_srgb,var(--success)_18%,white)] bg-[color:color-mix(in_srgb,var(--success)_10%,white)]",
            bodyClassName: "text-[var(--success)]",
        };
    }

    return {
        badgeVariant: "danger",
        icon: XCircle,
        panelClassName: "border-[color:color-mix(in_srgb,var(--danger)_22%,white)] bg-[color:color-mix(in_srgb,var(--danger)_8%,white)]",
        bodyClassName: "text-[var(--danger)]",
    };
};

export const formatUsedAt = (value?: string): string | null => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
};

export const shouldIgnoreDuplicateScan = (
    lastScanned: RecentScanRecord | null,
    token: string,
    now: number,
    cooldownMs: number,
): boolean => Boolean(lastScanned && lastScanned.token === token && now - lastScanned.at < cooldownMs);
