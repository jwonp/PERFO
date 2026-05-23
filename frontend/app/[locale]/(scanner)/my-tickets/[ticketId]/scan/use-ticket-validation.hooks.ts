"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateTicketQr } from "./scan.api";
import { RESULT_BANNER_MS, SCAN_COOLDOWN_MS, VISUAL_FEEDBACK_MS } from "./scan.constants";
import { formatUsedAt, resultLabelKey, shouldIgnoreDuplicateScan } from "./scan.func";
import type { RecentScanRecord, UseTicketValidationArgs, UseTicketValidationResult, ValidationResponse, VisualState } from "./scan.types";

export const useTicketValidation = ({
    ticketId,
    t,
    playResultTone,
}: UseTicketValidationArgs): UseTicketValidationResult => {
    const manualInputRef = useRef<HTMLInputElement | null>(null);
    const lastScannedRef = useRef<RecentScanRecord | null>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [qrToken, setQrToken] = useState("");
    const [result, setResult] = useState<ValidationResponse | null>(null);
    const [bannerResult, setBannerResult] = useState<ValidationResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [visualState, setVisualState] = useState<VisualState>("idle");
    const [showManualEntry, setShowManualEntry] = useState(false);

    const clearVisualTimeout = useCallback(() => {
        if (visualTimeoutRef.current) {
            clearTimeout(visualTimeoutRef.current);
            visualTimeoutRef.current = null;
        }
    }, []);

    const clearFeedbackTimeout = useCallback(() => {
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
            feedbackTimeoutRef.current = null;
        }
    }, []);

    const triggerVisualState = useCallback((nextState: VisualState, duration = VISUAL_FEEDBACK_MS) => {
        clearVisualTimeout();
        setVisualState(nextState);
        visualTimeoutRef.current = setTimeout(() => {
            setVisualState("idle");
            visualTimeoutRef.current = null;
        }, duration);
    }, [clearVisualTimeout]);

    const showBannerFeedback = useCallback((nextResult: ValidationResponse) => {
        clearFeedbackTimeout();
        setBannerResult(nextResult);
        feedbackTimeoutRef.current = setTimeout(() => {
            setBannerResult(null);
            feedbackTimeoutRef.current = null;
        }, RESULT_BANNER_MS);
    }, [clearFeedbackTimeout]);

    const submit = useCallback(async (tokenFromScanner?: string, source: "scanner" | "manual" = "manual") => {
        const token = (tokenFromScanner ?? qrToken).trim();
        if (!token) {
            const invalidResult = { result: "INVALID", message: t("myTickets.scanInvalid") };
            setResult(invalidResult);
            showBannerFeedback(invalidResult);
            triggerVisualState("error");
            void playResultTone("INVALID");
            return;
        }

        setSubmitting(true);
        try {
            const data = await validateTicketQr(ticketId, token);
            setResult(data);
            showBannerFeedback(data);
            triggerVisualState(data.result === "SUCCESS" ? "success" : "error");
            void playResultTone(data.result);
            if (data.result === "SUCCESS") {
                setQrToken("");
            }
        } catch {
            const networkErrorResult = { result: "INVALID", message: t("myTickets.scanNetworkError") };
            setResult(networkErrorResult);
            showBannerFeedback(networkErrorResult);
            triggerVisualState("error");
            void playResultTone("INVALID");
        } finally {
            setSubmitting(false);
            if (source === "manual") {
                requestAnimationFrame(() => {
                    manualInputRef.current?.focus();
                });
            }
        }
    }, [playResultTone, qrToken, showBannerFeedback, t, ticketId, triggerVisualState]);

    const handleDecodedText = useCallback((decoded: string) => {
        const trimmed = decoded.trim();
        if (!trimmed) {
            return;
        }

        const now = Date.now();
        if (shouldIgnoreDuplicateScan(lastScannedRef.current, trimmed, now, SCAN_COOLDOWN_MS)) {
            return;
        }

        lastScannedRef.current = { token: trimmed, at: now };
        setQrToken(trimmed);
        triggerVisualState("detected", 240);
        void submit(trimmed, "scanner");
    }, [submit, triggerVisualState]);

    useEffect(() => {
        return () => {
            clearFeedbackTimeout();
            clearVisualTimeout();
        };
    }, [clearFeedbackTimeout, clearVisualTimeout]);

    const translatedResultLabel = result
        ? (resultLabelKey(result.result) ? t(resultLabelKey(result.result) as string) : result.result)
        : null;
    const bannerLabel = bannerResult
        ? (resultLabelKey(bannerResult.result) ? t(resultLabelKey(bannerResult.result) as string) : bannerResult.result)
        : null;
    const recentDetail = result?.usedAt
        ? `${t("myTickets.scanUsedAt")}: ${formatUsedAt(result.usedAt)}`
        : result?.ticketNumber
            ? `${t("myTickets.scanTicketNumber")}: ${result.ticketNumber}`
            : null;

    return {
        qrToken,
        result,
        bannerResult,
        translatedResultLabel,
        bannerLabel,
        recentDetail,
        submitting,
        visualState,
        showManualEntry,
        manualInputRef,
        setQrToken,
        setShowManualEntry,
        submit,
        handleDecodedText,
    };
};
