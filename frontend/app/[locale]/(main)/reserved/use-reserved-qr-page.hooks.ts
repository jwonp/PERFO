"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useRouter } from "@/i18n/navigation";
import type {
    QrTokenErrorResponse,
    QrTokenResponse,
    QrTokenTerminalCode,
} from "./reserved-qr.types";

const QR_REFRESH_LEAD_MS = 10_000;
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

export const useReservedQrPage = () => {
    const params = useParams<{ reservationId: string }>();
    const t = useTranslations();
    const router = useRouter();
    const [data, setData] = useState<QrTokenResponse | null>(null);
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [terminalCode, setTerminalCode] = useState<QrTokenTerminalCode | undefined>(undefined);
    const [refreshTick, setRefreshTick] = useState(0);

    const loadToken = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/reservations/${params.reservationId}/qr-token`, {
                method: "POST",
            });
            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as QrTokenErrorResponse;
                setData(null);
                setQrImageUrl(null);
                if (body.code === "ALREADY_USED" || body.code === "NOT_OPEN" || body.code === "EXPIRED") {
                    setTerminalCode(body.code);
                    return;
                }
                setTerminalCode(undefined);
                setError(body.message ?? t("reserved.qrLoadError"));
                return;
            }
            const body = (await response.json()) as QrTokenResponse;
            setTerminalCode(undefined);
            const nextQrImageUrl = await QRCode.toDataURL(body.token, {
                errorCorrectionLevel: "M",
                margin: 1,
                width: 280,
                color: {
                    dark: "#14233f",
                    light: "#ffffff",
                },
            });
            setData(body);
            setQrImageUrl(nextQrImageUrl);
        } catch {
            setError(t("reserved.qrLoadError"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadToken();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.reservationId]);

    useEffect(() => {
        if (!data?.expiresAt || terminalCode) return;

        const expiresAtMs = new Date(data.expiresAt).getTime();
        const delayMs = expiresAtMs - Date.now() - QR_REFRESH_LEAD_MS;

        if (delayMs <= 0) {
            void loadToken();
            return;
        }

        const timer = setTimeout(() => {
            if (delayMs > MAX_TIMEOUT_DELAY_MS) {
                setRefreshTick((current) => current + 1);
                return;
            }
            void loadToken();
        }, Math.min(delayMs, MAX_TIMEOUT_DELAY_MS));
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.expiresAt, refreshTick, terminalCode]);

    const terminalTitle = terminalCode === "ALREADY_USED"
        ? t("reserved.qrStatusAlreadyUsedTitle")
        : terminalCode === "NOT_OPEN"
            ? t("reserved.qrStatusNotOpenTitle")
            : terminalCode === "EXPIRED"
                ? t("reserved.qrStatusExpiredTitle")
                : null;
    const terminalDescription = terminalCode === "ALREADY_USED"
        ? t("reserved.qrStatusAlreadyUsedDescription")
        : terminalCode === "NOT_OPEN"
            ? t("reserved.qrStatusNotOpenDescription")
            : terminalCode === "EXPIRED"
                ? t("reserved.qrStatusExpiredDescription")
                : null;

    return {
        t,
        router,
        data,
        qrImageUrl,
        loading,
        error,
        terminalCode,
        terminalTitle,
        terminalDescription,
        loadToken,
    };
};
