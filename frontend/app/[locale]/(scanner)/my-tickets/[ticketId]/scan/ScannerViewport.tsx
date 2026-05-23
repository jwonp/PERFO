"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, ScanLine, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/lib/utils";
import type { ScannerViewportProps } from "./scan.types";

const ScannerViewport = ({
    videoRef,
    scannerStatus,
    scannerStatusText,
    visualState,
    submitting,
    bannerResult,
    bannerLabel,
    t,
}: ScannerViewportProps) => (
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
);

export { ScannerViewport };
