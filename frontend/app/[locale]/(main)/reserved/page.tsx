"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import PageEmptyState from "@/components/layout/PageEmptyState";
import PageFilterBar from "@/components/layout/PageFilterBar";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useNotificationSnapshotBootstrap } from "@/components/notifications/use-notification-snapshot-bootstrap";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsButton } from "@/components/ui/tabs";
import { MOCK_TICKETS } from "./reserved.constants";

const ReservedPage = () => {
    const t = useTranslations();
    const locale = useLocale();
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    useNotificationSnapshotBootstrap(
        MOCK_TICKETS.map((ticket) => ({
            scope: "reserved",
            ticketId: ticket.id,
            ticketName: ticket.name,
            targetUrl: `/${locale}/reserved/${ticket.id}`,
            statuses: [
                {
                    statusKey: "ticketingStatus",
                    statusValue: ticket.ticketingStatus,
                },
                {
                    statusKey: "usageStatus",
                    statusValue: ticket.usageStatus,
                },
            ],
        })),
    );

    const filtered = showUsedOnly
        ? MOCK_TICKETS.filter((tk) => tk.usageStatus === "USED")
        : MOCK_TICKETS;

    return (
        <PageShell className="ds-shell">
            <div className="px-5 pt-8 pb-28">
                <PageSection spacing="lg">
                    <PageHeader
                        title={t("reserved.title")}
                        trailing={
                            <div className="flex items-center gap-1">
                                <NotificationButton />
                                <Button aria-label="검색" size="icon-sm" variant="ghost" className="text-primary hover:text-primary">
                                    <Search className="size-5" />
                                </Button>
                            </div>
                        }
                    />
                    <PageFilterBar>
                        <Tabs className="rounded-full border border-primary/30 bg-transparent p-0">
                            <TabsButton active={!showUsedOnly} onClick={() => setShowUsedOnly(false)}>
                                {t("reserved.tabAll")}
                            </TabsButton>
                            <TabsButton active={showUsedOnly} onClick={() => setShowUsedOnly(true)}>
                                {t("reserved.tabUsed")}
                            </TabsButton>
                        </Tabs>
                        <Button variant="outline" className="h-9 rounded-full border-primary/30 px-4 text-xs text-primary shadow-none">
                            {t("reserved.showUsedOnly")}
                            <SlidersHorizontal className="size-3.5" />
                        </Button>
                    </PageFilterBar>

                    {filtered.length === 0 ? (
                        <PageEmptyState
                            title={t("reserved.empty")}
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                            </svg>
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-5">
                            {filtered.map((ticket) => (
                                <TicketCard
                                    key={ticket.id}
                                    name={ticket.name}
                                    venue={ticket.venue}
                                    validDate={ticket.validDate}
                                    imageUrl={ticket.imageUrl}
                                    usageStatus={ticket.usageStatus}
                                    ticketNumber={ticket.ticketNumber}
                                    totalCount={ticket.totalCount}
                                    qrActionLabel={t("reserved.qrShow")}
                                    qrActionHref={`/reserved/${ticket.id}`}
                                />
                            ))}
                        </div>
                    )}
                </PageSection>
            </div>
        </PageShell>
    );
};

export default ReservedPage;
