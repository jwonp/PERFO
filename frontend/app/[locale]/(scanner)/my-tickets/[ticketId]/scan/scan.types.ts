import type { LucideIcon } from "lucide-react";
import type { useTranslations } from "next-intl";

export type ValidationResponse = {
    result: string;
    ticketNumber?: number;
    usedAt?: string;
    message?: string;
};

export type ScannerStatus = "idle" | "ready" | "blocked" | "error";
export type VisualState = "idle" | "detected" | "success" | "error";
export type SubmissionSource = "scanner" | "manual";

export interface RecentScanRecord {
    token: string;
    at: number;
}

export interface ResultMeta {
    badgeVariant: "neutral" | "info" | "success" | "warning" | "danger";
    icon: LucideIcon;
    panelClassName: string;
    bodyClassName: string;
}

export interface UseScanAudioResult {
    soundEnabled: boolean;
    primeAudio: (force?: boolean) => Promise<AudioContext | null>;
    playResultTone: (status: string) => Promise<void>;
    toggleSoundEnabled: () => Promise<void>;
}

export interface UseQrScannerArgs {
    onDecodedText: (decoded: string) => void;
}

export interface UseQrScannerResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    scannerStatus: ScannerStatus;
}

export interface UseTicketValidationArgs {
    ticketId: string;
    t: ReturnType<typeof useTranslations>;
    playResultTone: (status: string) => Promise<void>;
}

export interface UseTicketValidationResult {
    qrToken: string;
    result: ValidationResponse | null;
    bannerResult: ValidationResponse | null;
    translatedResultLabel: string | null;
    bannerLabel: string | null;
    recentDetail: string | null;
    submitting: boolean;
    visualState: VisualState;
    showManualEntry: boolean;
    manualInputRef: React.RefObject<HTMLInputElement | null>;
    setQrToken: React.Dispatch<React.SetStateAction<string>>;
    setShowManualEntry: React.Dispatch<React.SetStateAction<boolean>>;
    submit: (tokenFromScanner?: string, source?: SubmissionSource) => Promise<void>;
    handleDecodedText: (decoded: string) => void;
}

export interface ScannerViewportProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    scannerStatus: ScannerStatus;
    scannerStatusText: string;
    visualState: VisualState;
    submitting: boolean;
    bannerResult: ValidationResponse | null;
    bannerLabel: string | null;
    t: ReturnType<typeof useTranslations>;
}

export interface ScanResultPanelProps {
    result: ValidationResponse | null;
    translatedResultLabel: string | null;
    recentDetail: string | null;
    showManualEntry: boolean;
    onToggleManualEntry: () => void;
    t: ReturnType<typeof useTranslations>;
}

export interface ManualTokenEntryProps {
    showManualEntry: boolean;
    manualInputRef: React.RefObject<HTMLInputElement | null>;
    qrToken: string;
    submitting: boolean;
    onQrTokenChange: (value: string) => void;
    onSubmit: () => void;
    t: ReturnType<typeof useTranslations>;
}
