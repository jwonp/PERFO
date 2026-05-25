"use client";

import { Button } from "@/components/ui/button";
import type { QrTokenTerminalCode, QrTokenResponse } from "./reserved-qr.types";

type ReservedQrScreenProps = {
    t: (key: string) => string;
    data: QrTokenResponse | null;
    qrImageUrl: string | null;
    loading: boolean;
    error: string | null;
    terminalCode: QrTokenTerminalCode | undefined;
    terminalTitle: string | null;
    terminalDescription: string | null;
    onBackToList: () => void;
    onRefresh: () => void;
};

export const ReservedQrScreen = ({
    t,
    data,
    qrImageUrl,
    loading,
    error,
    terminalCode,
    terminalTitle,
    terminalDescription,
    onBackToList,
    onRefresh,
}: ReservedQrScreenProps) => {
    return (
        <div className="space-y-4 px-5 pt-8 pb-10">
            <h1 className="text-lg font-extrabold text-primary">{t("reserved.qrTitle")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{t("reserved.qrDescription")}</p>

            <div className="rounded-xl border border-border bg-[var(--surface-raised)] p-4">
                {loading ? (
                    <p className="text-sm text-[var(--text-muted)]">{t("reserved.qrLoading")}</p>
                ) : terminalCode && terminalTitle && terminalDescription ? (
                    <div className="space-y-2 rounded-xl border border-border bg-[var(--surface-muted)] p-4">
                        <p className="text-sm font-semibold text-[var(--text)]">{terminalTitle}</p>
                        <p className="text-sm text-[var(--text-muted)]">{terminalDescription}</p>
                    </div>
                ) : error ? (
                    <p className="text-sm text-[var(--danger)]">{error}</p>
                ) : data ? (
                    <>
                        <p className="text-xs text-[var(--text-muted)]">{t("reserved.qrExpiresAt")}: {data.expiresAt}</p>
                        {qrImageUrl ? (
                            <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrImageUrl}
                                    alt="Reservation QR code"
                                    className="mx-auto h-auto w-full max-w-[280px]"
                                />
                            </div>
                        ) : null}
                        <pre className="mt-4 overflow-x-auto rounded-md bg-[var(--surface-muted)] p-3 text-xs text-[var(--text)]">{data.token}</pre>
                    </>
                ) : null}
            </div>

            {terminalCode ? (
                <Button onClick={onBackToList} variant="outline" className="h-11 w-full rounded-xl border-border">
                    {t("reserved.qrBackToList")}
                </Button>
            ) : (
                <Button onClick={onRefresh} variant="outline" className="h-11 w-full rounded-xl border-border">
                    {t("reserved.qrRefresh")}
                </Button>
            )}
        </div>
    );
};
