"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { ScannerViewport } from "./ScannerViewport";
import { ScanResultPanel } from "./ScanResultPanel";
import { useQrScanner } from "./use-qr-scanner.hooks";
import { useScanAudio } from "./use-scan-audio.hooks";
import { useTicketValidation } from "./use-ticket-validation.hooks";

const TicketScanPage = () => {
    const params = useParams<{ ticketId: string }>();
    const t = useTranslations();

    const {
        soundEnabled,
        primeAudio,
        playResultTone,
        toggleSoundEnabled,
    } = useScanAudio();

    const {
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
    } = useTicketValidation({
        ticketId: params.ticketId,
        t,
        playResultTone,
    });

    const {
        videoRef,
        scannerStatus,
    } = useQrScanner({
        onDecodedText: handleDecodedText,
    });

    const scannerStatusText = scannerStatus === "ready"
        ? t("myTickets.scanCameraReadyShort")
        : scannerStatus === "blocked"
            ? t("myTickets.scanCameraBlockedShort")
            : scannerStatus === "error"
                ? t("myTickets.scanCameraErrorShort")
                : t("myTickets.scanStatusIdle");

    useEffect(() => {
        if (scannerStatus === "blocked" || scannerStatus === "error") {
            setShowManualEntry(true);
        }
    }, [scannerStatus, setShowManualEntry]);

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
                    onClick={() => void toggleSoundEnabled()}
                >
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2">
                <ScannerViewport
                    videoRef={videoRef}
                    scannerStatus={scannerStatus}
                    scannerStatusText={scannerStatusText}
                    visualState={visualState}
                    submitting={submitting}
                    bannerResult={bannerResult}
                    bannerLabel={bannerLabel}
                    t={t}
                />

                <ScanResultPanel
                    result={result}
                    translatedResultLabel={translatedResultLabel}
                    recentDetail={recentDetail}
                    showManualEntry={showManualEntry}
                    onToggleManualEntry={() => setShowManualEntry((current) => !current)}
                    manualInputRef={manualInputRef}
                    qrToken={qrToken}
                    submitting={submitting}
                    onQrTokenChange={(value) => setQrToken(value)}
                    onSubmit={() => void submit(undefined, "manual")}
                    t={t}
                />
            </div>
        </PageShell>
    );
};

export default TicketScanPage;
