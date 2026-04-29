"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type QrTokenResponse = {
    token: string;
    expiresAt: string;
};

const ReservedQrPage = () => {
    const params = useParams<{ reservationId: string }>();
    const t = useTranslations();
    const [data, setData] = useState<QrTokenResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadToken = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/reservations/${params.reservationId}/qr-token`, {
                method: "POST",
            });
            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as { message?: string };
                setError(body.message ?? t("reserved.qrLoadError"));
                return;
            }
            const body = (await response.json()) as QrTokenResponse;
            setData(body);
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

    return (
        <div className="space-y-4 px-5 pt-8 pb-10">
            <h1 className="text-lg font-extrabold text-primary">{t("reserved.qrTitle")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{t("reserved.qrDescription")}</p>

            <div className="rounded-xl border border-border bg-[var(--surface-raised)] p-4">
                {loading ? (
                    <p className="text-sm text-[var(--text-muted)]">{t("reserved.qrLoading")}</p>
                ) : error ? (
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                ) : data ? (
                    <>
                        <p className="text-xs text-[var(--text-muted)]">{t("reserved.qrExpiresAt")}: {data.expiresAt}</p>
                        <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--surface-muted)] p-3 text-xs text-[var(--text)]">{data.token}</pre>
                    </>
                ) : null}
            </div>

            <Button onClick={loadToken} variant="outline" className="h-11 w-full rounded-xl border-border">
                {t("reserved.qrRefresh")}
            </Button>
        </div>
    );
};

export default ReservedQrPage;
