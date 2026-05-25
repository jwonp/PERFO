"use client";

import { ReservedQrScreen } from "../ReservedQrScreen";
import { useReservedQrPage } from "../use-reserved-qr-page.hooks";

const ReservedQrPage = () => {
    const {
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
    } = useReservedQrPage();

    return (
        <ReservedQrScreen
            t={t}
            data={data}
            qrImageUrl={qrImageUrl}
            loading={loading}
            error={error}
            terminalCode={terminalCode}
            terminalTitle={terminalTitle}
            terminalDescription={terminalDescription}
            onBackToList={() => router.push("/reserved")}
            onRefresh={() => void loadToken()}
        />
    );
};

export default ReservedQrPage;
