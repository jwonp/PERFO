"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { AlertTriangle, CheckCircle2, LoaderCircle, ScanLine, Volume2, VolumeX, XCircle } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/lib/utils";

type ValidationResponse = {
    result: string;
    ticketNumber?: number;
    usedAt?: string;
    message?: string;
};

type ScannerStatus = "idle" | "ready" | "blocked" | "error";
type VisualState = "idle" | "detected" | "success" | "error";
type SubmissionSource = "scanner" | "manual";

const SCAN_COOLDOWN_MS = 1200;
const RESULT_BANNER_MS = 1400;
const VISUAL_FEEDBACK_MS = 520;

const resultLabelKey = (status: string) => {
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

const resultMeta = (status: string) => {
    if (status === "SUCCESS") {
        return {
            badgeVariant: "success" as const,
            icon: CheckCircle2,
            panelClassName: "border-[color:color-mix(in_srgb,var(--success)_18%,white)] bg-[color:color-mix(in_srgb,var(--success)_10%,white)]",
            bodyClassName: "text-[var(--success)]",
        };
    }

    return {
        badgeVariant: "danger" as const,
        icon: XCircle,
        panelClassName: "border-[color:color-mix(in_srgb,var(--danger)_22%,white)] bg-[color:color-mix(in_srgb,var(--danger)_8%,white)]",
        bodyClassName: "text-[var(--danger)]",
    };
};

const formatUsedAt = (value?: string) => {
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

const TicketScanPage = () => {
    const params = useParams<{ ticketId: string }>();
    const t = useTranslations();

    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<{ stop: () => void } | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const manualInputRef = useRef<HTMLInputElement | null>(null);
    const lastScannedRef = useRef<{ token: string; at: number } | null>(null);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const [qrToken, setQrToken] = useState("");
    const [result, setResult] = useState<ValidationResponse | null>(null);
    const [bannerResult, setBannerResult] = useState<ValidationResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("idle");
    const [visualState, setVisualState] = useState<VisualState>("idle");
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const stopScanner = useCallback(() => {
        controlsRef.current?.stop();
        controlsRef.current = null;
    }, []);

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

    const primeAudio = useCallback(async (force = false) => {
        if (typeof window === "undefined" || (!force && !soundEnabled)) {
            return null;
        }

        const AudioContextClass =
            window.AudioContext ??
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === "suspended") {
            try {
                await audioContextRef.current.resume();
            } catch {
                return null;
            }
        }

        return audioContextRef.current;
    }, [soundEnabled]);

    const playResultTone = useCallback(async (status: string) => {
        if (status !== "SUCCESS" && !resultLabelKey(status)) {
            return;
        }

        const audioContext = await primeAudio();
        if (!audioContext || audioContext.state !== "running") {
            return;
        }

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = status === "SUCCESS" ? "sine" : "square";
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.0001, now);

        if (status === "SUCCESS") {
            oscillator.frequency.setValueAtTime(1046, now);
            gainNode.gain.exponentialRampToValueAtTime(0.075, now + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.18);
            return;
        }

        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.setValueAtTime(180, now + 0.12);
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        gainNode.gain.setValueAtTime(0.0001, now + 0.11);
        gainNode.gain.exponentialRampToValueAtTime(0.075, now + 0.14);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        oscillator.start(now);
        oscillator.stop(now + 0.28);
    }, [primeAudio]);

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

    const submit = useCallback(async (tokenFromScanner?: string, source: SubmissionSource = "manual") => {
        const token = (tokenFromScanner ?? qrToken).trim();
        if (!token) {
            setResult({ result: "INVALID", message: t("myTickets.scanInvalid") });
            showBannerFeedback({ result: "INVALID", message: t("myTickets.scanInvalid") });
            triggerVisualState("error");
            void playResultTone("INVALID");
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
    }, [params.ticketId, playResultTone, qrToken, showBannerFeedback, t, triggerVisualState]);

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
        triggerVisualState("detected", 240);
        void submit(trimmed, "scanner");
    }, [submit, triggerVisualState]);

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

    useEffect(() => {
        if (typeof window === "undefined" || !videoRef.current) {
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
    }, [handleDecodedText, stopScanner]);

    useEffect(() => {
        if (scannerStatus === "blocked" || scannerStatus === "error") {
            setShowManualEntry(true);
        }
    }, [scannerStatus]);

    useEffect(() => {
        return () => {
            clearFeedbackTimeout();
            clearVisualTimeout();
            void audioContextRef.current?.close();
        };
    }, [clearFeedbackTimeout, clearVisualTimeout]);

    const scannerStatusText = scannerStatus === "ready"
        ? t("myTickets.scanCameraReadyShort")
        : scannerStatus === "blocked"
            ? t("myTickets.scanCameraBlockedShort")
            : scannerStatus === "error"
                ? t("myTickets.scanCameraErrorShort")
                : t("myTickets.scanStatusIdle");

    return (
        <PageShell
            className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),0.75rem)]"
            onPointerDownCapture={() => {
                void primeAudio();
            }}
        >
            <header className="flex items-center justify-between gap-3 px-1 pb-2">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                        {t("myTickets.scan")}
                    </p>
                    <h1 className="truncate text-base font-extrabold text-primary">
                        {t("myTickets.scanTitle")}
                    </h1>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={soundEnabled ? t("myTickets.scanSoundOn") : t("myTickets.scanSoundOff")}
                    className="rounded-full border-border bg-[var(--surface-raised)]"
                    onClick={async () => {
                        const nextValue = !soundEnabled;
                        setSoundEnabled(nextValue);
                        if (nextValue) {
                            await primeAudio(true);
                        }
                    }}
                >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <section
                    className={cn(
                        "relative min-h-[300px] flex-1 overflow-hidden rounded-[28px] border bg-foreground shadow-[var(--shadow-soft)] transition-colors duration-200",
                        visualState === "success" && "border-[color:color-mix(in_srgb,var(--success)_40%,white)]",
                        visualState === "error" && "border-[color:color-mix(in_srgb,var(--danger)_42%,white)]",
                        visualState !== "success" && visualState !== "error" && "border-border"
                    )}
                >
                    <div
                        className={cn(
                            "pointer-events-none absolute inset-0 z-10 transition-colors duration-200",
                            visualState === "detected" && "bg-amber-300/8",
                            visualState === "success" && "bg-emerald-400/16",
                            visualState === "error" && "bg-rose-500/14"
                        )}
                    />
                    <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
                        <Badge variant="neutral" className="bg-black/45 text-white backdrop-blur">
                            <ScanLine className="mr-1 h-3 w-3" />
                            {scannerStatusText}
                        </Badge>
                        {submitting ? (
                            <Badge variant="neutral" className="bg-black/45 text-white backdrop-blur">
                                <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                                {t("myTickets.scanSubmittingShort")}
                            </Badge>
                        ) : null}
                    </div>
                    <video
                        ref={videoRef}
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        playsInline
                    />
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
                        <div
                            className={cn(
                                "h-[46%] max-h-[280px] w-full max-w-[240px] rounded-[26px] border-2 border-white/85 bg-transparent shadow-[0_0_0_999px_rgba(7,11,18,0.22)] transition-all duration-200",
                                visualState === "detected" && "scale-[1.02] border-amber-300 shadow-[0_0_0_999px_rgba(7,11,18,0.16)]",
                                visualState === "success" && "scale-[1.025] border-emerald-300 shadow-[0_0_0_999px_rgba(22,163,74,0.16)]",
                                visualState === "error" && "border-rose-300 shadow-[0_0_0_999px_rgba(225,29,72,0.14)]"
                            )}
                        />
                    </div>
                    {(scannerStatus === "blocked" || scannerStatus === "error") ? (
                        <div className="absolute inset-x-3 top-14 z-30 rounded-2xl border border-white/20 bg-black/60 px-3 py-2.5 text-xs text-white backdrop-blur">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                                <span>{scannerStatus === "blocked" ? t("myTickets.scanCameraBlocked") : t("myTickets.scanCameraError")}</span>
                            </div>
                        </div>
                    ) : null}
                    {bannerResult ? (
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30">
                            <div
                                className={cn(
                                    "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur",
                                    bannerResult.result === "SUCCESS"
                                        ? "border-emerald-200/30 bg-emerald-500/78"
                                        : "border-rose-200/30 bg-rose-500/78"
                                )}
                            >
                                {bannerResult.result === "SUCCESS" ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                ) : (
                                    <XCircle className="h-4 w-4 shrink-0" />
                                )}
                                <span className="truncate">{bannerLabel}</span>
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="shrink-0 rounded-[24px] border border-border bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-soft)]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                                {t("myTickets.scanRecentResult")}
                            </p>
                            {result ? (
                                <div className={cn("mt-2 rounded-2xl border px-3 py-2.5", resultMeta(result.result).panelClassName)}>
                                    <div className="flex items-start gap-2.5">
                                        {(() => {
                                            const meta = resultMeta(result.result);
                                            const Icon = meta.icon;

                                            return (
                                                <>
                                                    <div className="rounded-full bg-white/80 p-1.5 shadow-sm">
                                                        <Icon className={cn("h-4 w-4", meta.bodyClassName)} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <Badge variant={meta.badgeVariant} className="max-w-full truncate">
                                                            {translatedResultLabel}
                                                        </Badge>
                                                        <p className="mt-1 truncate text-sm font-semibold text-[var(--text)]">
                                                            {result.message || translatedResultLabel}
                                                        </p>
                                                        {recentDetail ? (
                                                            <p className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                                                                {recentDetail}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-[var(--text-muted)]">
                                    {t("myTickets.scanRecentEmpty")}
                                </div>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="rounded-full text-[var(--text-muted)]"
                            onClick={() => {
                                setShowManualEntry((current) => !current);
                            }}
                        >
                            {showManualEntry ? t("myTickets.scanManualHide") : t("myTickets.scanManualShow")}
                        </Button>
                    </div>

                    {showManualEntry ? (
                        <div className="mt-3 flex items-center gap-2">
                            <Input
                                ref={manualInputRef}
                                value={qrToken}
                                onChange={(event) => setQrToken(event.target.value)}
                                placeholder={t("myTickets.scanPlaceholder")}
                                className="h-10 rounded-xl border-border text-sm"
                            />
                            <Button
                                type="button"
                                onClick={() => void submit(undefined, "manual")}
                                disabled={submitting}
                                size="sm"
                                className="h-10 shrink-0 rounded-xl px-3"
                            >
                                {t("myTickets.scanSubmit")}
                            </Button>
                        </div>
                    ) : null}
                </section>
            </div>
        </PageShell>
    );
};

export default TicketScanPage;
