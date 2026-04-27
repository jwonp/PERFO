"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { TicketCard } from "@/components/tickets/TicketCard";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state";
import { Tabs, TabsButton } from "@/components/ui/tabs";
import { MOCK_TICKETS } from "./reserved.constants";

const ReservedPage = () => {
    const t = useTranslations();
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    const filtered = showUsedOnly
        ? MOCK_TICKETS.filter((tk) => tk.usageStatus === "USED")
        : MOCK_TICKETS;

    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-5 px-5 pt-8 pb-28">
                <header className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-extrabold text-perfo-primary">{t("reserved.title")}</h1>
                        <Button aria-label="검색" size="icon-sm" variant="ghost" className="text-perfo-primary hover:text-perfo-primary">
                            <Search className="size-5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs className="rounded-full border border-perfo-primary bg-transparent p-0">
                            <TabsButton active={!showUsedOnly} onClick={() => setShowUsedOnly(false)}>
                                {t("reserved.tabAll")}
                            </TabsButton>
                            <TabsButton active={showUsedOnly} onClick={() => setShowUsedOnly(true)}>
                                {t("reserved.tabUsed")}
                            </TabsButton>
                        </Tabs>
                        <Button variant="outline" className="h-9 rounded-full border-perfo-primary px-4 text-xs text-perfo-primary shadow-none">
                            {t("reserved.showUsedOnly")}
                            <SlidersHorizontal className="size-3.5" />
                        </Button>
                    </div>
                </header>

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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReservedPage;
