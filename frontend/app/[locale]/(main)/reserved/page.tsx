"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state";
import { StatCard, StatLabel, StatMeta, StatValue } from "@/components/ui/stat-card";
import { Tabs, TabsButton } from "@/components/ui/tabs";
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeader, ToolbarTitle } from "@/components/ui/toolbar";
import { MOCK_TICKETS } from "./reserved.constants";

const ReservedPage = () => {
    const t = useTranslations();
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    const filtered = showUsedOnly
        ? MOCK_TICKETS.filter((tk) => tk.usageStatus === "USED")
        : MOCK_TICKETS;

    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-4 px-5 pt-4 pb-28 lg:pb-4">
                <Toolbar className="sticky top-4 z-10">
                    <ToolbarHeader>
                        <div className="space-y-2">
                            <p className="ds-eyebrow">Queue View</p>
                            <ToolbarTitle>{t("reserved.title")}</ToolbarTitle>
                            <ToolbarDescription>{t("reserved.showUsedOnly")}</ToolbarDescription>
                        </div>
                        <ToolbarActions>
                            <Button aria-label="검색" size="icon-sm" variant="ghost" className="text-perfo-secondary hover:text-perfo-primary">
                                <Search className="size-5" />
                            </Button>
                            <Button aria-label="알림" size="icon-sm" variant="ghost" className="text-perfo-secondary hover:text-perfo-primary">
                                <Bell className="size-5" />
                            </Button>
                        </ToolbarActions>
                    </ToolbarHeader>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <StatCard>
                                <StatLabel>{t("reserved.tabAll")}</StatLabel>
                                <StatValue>{MOCK_TICKETS.length}</StatValue>
                                <StatMeta>{t("reserved.title")}</StatMeta>
                            </StatCard>
                            <StatCard>
                                <StatLabel>{t("reserved.tabUsed")}</StatLabel>
                                <StatValue>{MOCK_TICKETS.filter((ticket) => ticket.usageStatus === "USED").length}</StatValue>
                                <StatMeta>{t("reserved.showUsedOnly")}</StatMeta>
                            </StatCard>
                            <StatCard>
                                <StatLabel>{t("reserved.statusMyTurn")}</StatLabel>
                                <StatValue>{MOCK_TICKETS.filter((ticket) => ticket.usageStatus === "MY_TURN").length}</StatValue>
                                <StatMeta>{t("reserved.statusWaiting")}</StatMeta>
                            </StatCard>
                        </div>
                        <Tabs className="w-full justify-start lg:w-auto">
                            <TabsButton active={!showUsedOnly} onClick={() => setShowUsedOnly(false)}>
                                {t("reserved.tabAll")}
                            </TabsButton>
                            <TabsButton active={showUsedOnly} onClick={() => setShowUsedOnly(true)}>
                                {t("reserved.tabUsed")}
                            </TabsButton>
                        </Tabs>
                    </div>
                </Toolbar>

                {/* Ticket list */}
                {filtered.length === 0 ? (
                    <EmptyState>
                        <EmptyStateIcon>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                        </svg>
                        </EmptyStateIcon>
                        <EmptyStateTitle>{t("reserved.empty")}</EmptyStateTitle>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReservedPage;
