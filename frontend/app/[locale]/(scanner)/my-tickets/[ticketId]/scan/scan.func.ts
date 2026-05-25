import { CheckCircle2, XCircle } from "lucide-react";
import type { RecentScanRecord, ResultMeta, ScannerStatus } from "./scan.types";

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
            panelClassName: "border-border bg-[var(--surface-raised)]",
            bodyClassName: "text-[var(--success)]",
        };
    }

    return {
        badgeVariant: "danger",
        icon: XCircle,
        panelClassName: "border-border bg-[var(--surface-raised)]",
        bodyClassName: "text-[var(--danger)]",
    };
};

const RECOVERABLE_ZXING_MESSAGES = [
    "No MultiFormat Readers were able to detect the code.",
    "Checksum",
    "Format",
];

export const isRecoverableScannerError = (error: unknown): boolean => {
    const name = error instanceof Error
        ? error.name
        : typeof error === "object" && error !== null && "name" in error
            ? String((error as { name?: unknown }).name ?? "")
            : "";
    const message = error instanceof Error ? error.message : "";

    // Class names are minified in production builds, so check message content as fallback
    if (name === "NotFoundException" || name === "ChecksumException" || name === "FormatException") {
        return true;
    }
    return RECOVERABLE_ZXING_MESSAGES.some((m) => message.includes(m));
};

export const resolveScannerFailureStatus = (error: unknown): ScannerStatus => {
    const name = error instanceof Error
        ? error.name
        : typeof error === "object" && error !== null && "name" in error
            ? String((error as { name?: unknown }).name ?? "")
            : "";

    if (name === "NotAllowedError" || name === "NotFoundError" || name === "SecurityError") {
        return "blocked";
    }

    return "error";
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
