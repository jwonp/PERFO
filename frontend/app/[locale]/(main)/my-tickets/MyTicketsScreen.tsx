"use client";

import { Plus, Search } from "lucide-react";
import PageFab from "@/components/layout/PageFab";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { Button } from "@/components/ui/button";
import { TicketFilterTabs } from "./TicketFilterTabs";
import { TicketFormSheet } from "./TicketFormSheet";
import { TicketList } from "./TicketList";
import type { MyTicketsScreenProps } from "./my-tickets.types";

const MyTicketsScreen = ({
    filteredTickets,
    hasLoadedTickets,
    locale,
    copiedTicketId,
    canShareBookingUrl,
    emptyStateTitle,
    onEdit,
    onCopyBookingUrl,
    onShareBookingUrl,
    t,
    sheetOpen,
    editTarget,
    duplicateFilter,
    onOpenCreate,
    onCloseSheet,
    onChangeFilter,
    onSubmit,
}: MyTicketsScreenProps) => (
    <PageShell className="min-h-full ds-shell">
        <div className="px-5 pt-8">
            <PageSection spacing="lg">
                <PageHeader
                    title={t("myTickets.title")}
                    trailing={
                        <div className="flex items-center gap-1">
                            <NotificationButton />
                            <Button aria-label="검색" size="icon-sm" variant="ghost" className="text-primary hover:text-primary">
                                <Search className="size-5" />
                            </Button>
                        </div>
                    }
                />
                <TicketFilterTabs duplicateFilter={duplicateFilter} onChange={onChangeFilter} t={t} />
            </PageSection>
        </div>

        <div className="space-y-3 px-5 pb-28 pt-5">
            <TicketList
                filteredTickets={filteredTickets}
                hasLoadedTickets={hasLoadedTickets}
                locale={locale}
                copiedTicketId={copiedTicketId}
                canShareBookingUrl={canShareBookingUrl}
                emptyStateTitle={emptyStateTitle}
                onEdit={onEdit}
                onCopyBookingUrl={onCopyBookingUrl}
                onShareBookingUrl={onShareBookingUrl}
                t={t}
            />
        </div>

        <PageFab onClick={onOpenCreate} aria-label="티켓 발급">
            <Plus className="size-6" />
        </PageFab>

        <TicketFormSheet
            open={sheetOpen}
            editTarget={editTarget}
            onClose={onCloseSheet}
            onSubmit={onSubmit}
            t={t}
        />
    </PageShell>
);

export { MyTicketsScreen };
