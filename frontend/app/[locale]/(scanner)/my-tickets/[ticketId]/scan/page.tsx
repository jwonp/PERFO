"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrowserMultiFormatReader } from "@zxing/browser";
import PageHeader from "@/components/layout/PageHeader";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ValidationResponse = {
    result: string;
    ticketNumber?: number;
    usedAt?: string;
    message?: string;
};

const SCAN_COOLDOWN_MS = 2000;

const TicketScanPage = () => {
    const params = useParams<{ ticketId: string }>();
    const t = useTranslations();

    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastScannedRef = useRef<{ token: string; at: number } | null>(null);

    const [qrToken, setQrToken] = useState("");
    const [result, setResult] = useState<ValidationResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<"idle" | "ready" | "blocked" | "error">("idle");

    const canStartScanner = useMemo(() => typeof window !== "undefined", []);

    const stopScanner = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;
    }, []);

    const submit = useCallback(async (tokenFromScanner?: string) => {
        const token = (tokenFromScanner ?? qrToken).trim();
        if (!token) {
            setResult({ result: "INVALID", message: t("myTickets.scanInvalid") });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/tickets/${params.ticketId}/validations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ qrToken: token }),
            });

            const data = (await response.json().catch(() => ({}))) as ValidationResponse;
            setResult(data);
        } catch {
            setResult({ result: "INVALID", message: t("myTickets.scanNetworkError") });
        } finally {
            setSubmitting(false);
        }
    }, [params.ticketId, qrToken, t]);

    const handleDecodedText = useCallback((decoded: string) => {
        const trimmed = decoded.trim();
        if (!trimmed) {
            return;
        }

        const now = Date.now();
        const last = lastScannedRef.current;
        if (last && last.token === trimmed && now - last.at < SCAN_COOLDOWN_MS) {
            return;
        }

        lastScannedRef.current = { token: trimmed, at: now };
        setQrToken(trimmed);
        void submit(trimmed);
    }, [submit]);

    useEffect(() => {
        if (!canStartScanner || !videoRef.current) {
            return;
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        reader
            .decodeFromVideoDevice(undefined, videoRef.current, (resultValue, error) => {
                if (resultValue) {
                    handleDecodedText(resultValue.getText());
                    return;
                }

                if (error && !(error instanceof Error && error.name === "NotFoundException")) {
                    setScannerStatus("error");
                }
            })
            .then((controls) => {
                controlsRef.current = controls;
                setScannerStatus("ready");
            })
            .catch(() => {
                setScannerStatus("blocked");
            });

        return () => {
            stopScanner();
            readerRef.current = null;
        };
    }, [canStartScanner, handleDecodedText, stopScanner]);

    return (
        <PageShell className="mx-auto w-full max-w-[430px] space-y-4 px-5 pt-8 pb-10">
            <PageHeader
                title={t("myTickets.scanTitle")}
                description={t("myTickets.scanDescription")}
            />

            <div className="overflow-hidden rounded-xl border border-border bg-foreground/90">
                <video
                    ref={videoRef}
                    className="h-[280px] w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                />
            </div>

            {scannerStatus === "ready" ? (
                <p className="text-xs text-[var(--text-muted)]">{t("myTickets.scanCameraReady")}</p>
            ) : null}
            {scannerStatus === "blocked" ? (
                <p className="text-xs text-[var(--danger)]">{t("myTickets.scanCameraBlocked")}</p>
            ) : null}
            {scannerStatus === "error" ? (
                <p className="text-xs text-[var(--danger)]">{t("myTickets.scanCameraError")}</p>
            ) : null}

            <Input
                value={qrToken}
                onChange={(event) => setQrToken(event.target.value)}
                placeholder={t("myTickets.scanPlaceholder")}
                className="h-11 rounded-xl border-border"
            />
            <Button onClick={() => void submit()} disabled={submitting} className="h-11 w-full rounded-xl">
                {submitting ? t("myTickets.scanSubmitting") : t("myTickets.scanSubmit")}
            </Button>

            {result ? (
                <div className="rounded-xl border border-border bg-[var(--surface-raised)] p-4">
                    <p className="text-sm font-semibold text-primary">{result.result}</p>
                    {result.message ? <p className="mt-1 text-xs text-[var(--text-muted)]">{result.message}</p> : null}
                    {result.ticketNumber ? (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{t("myTickets.scanTicketNumber")}: {result.ticketNumber}</p>
                    ) : null}
                    {result.usedAt ? (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{t("myTickets.scanUsedAt")}: {result.usedAt}</p>
                    ) : null}
                </div>
            ) : null}
        </PageShell>
    );
};

export default TicketScanPage;
