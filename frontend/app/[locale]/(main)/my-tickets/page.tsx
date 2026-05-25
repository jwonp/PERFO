"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MyTicketsScreen } from "./MyTicketsScreen";
import { useMyTicketsController } from "./use-my-tickets.hooks";

const MyTicketsPage = () => {
    const t = useTranslations();
    const locale = useLocale();
    const controller = useMyTicketsController({ locale, t });

    useEffect(() => {
        const firstImageUrl = controller.filteredTickets[0]?.imageUrl;
        if (!firstImageUrl) return;
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = firstImageUrl;
        link.fetchPriority = "high";
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, [controller.filteredTickets]);

    return (
        <MyTicketsScreen
            locale={locale}
            t={t}
            filteredTickets={controller.filteredTickets}
            hasLoadedTickets={controller.hasLoadedTickets}
            sheetOpen={controller.sheetOpen}
            editTarget={controller.editTarget}
            duplicateFilter={controller.duplicateFilter}
            copiedTicketId={controller.copiedTicketId}
            canShareBookingUrl={controller.canShareBookingUrl}
            emptyStateTitle={controller.emptyStateTitle}
            onEdit={controller.openEdit}
            onCopyBookingUrl={controller.handleCopyBookingUrl}
            onShareBookingUrl={controller.handleShareBookingUrl}
            onSubmit={controller.handleSubmit}
            onOpenCreate={controller.openCreate}
            onCloseSheet={controller.handleClose}
            onChangeFilter={controller.setDuplicateFilter}
        />
    );
};

export default MyTicketsPage;
