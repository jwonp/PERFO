"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
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
import type { Ticket } from "./reserved.types";

const ReservedPage = () => {
    const t = useTranslations();
    const locale = useLocale();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [hasLoadedTickets, setHasLoadedTickets] = useState(false);
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    useNotificationSnapshotBootstrap(
        tickets.map((ticket) => ({
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

    useEffect(() => {
        let active = true;

        void fetch("/api/reservations", { cache: "no-store" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("failed");
                }
                return response.json();
            })
            .then((items: Array<Record<string, unknown>>) => {
                if (!active) {
                    return;
                }

                setTickets(items.map((item) => ({
                    id: String(item.id),
                    name: String(item.name),
                    ticketNumber: Number(item.ticketNumber),
                    totalCount: Number(item.totalCount),
                    venue: String(item.venue),
                    validDate: String(item.validDate),
                    ticketingStatus: String(item.ticketingStatus) as Ticket["ticketingStatus"],
                    usageStatus: String(item.usageStatus) as Ticket["usageStatus"],
                })));
                setHasLoadedTickets(true);
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setHasLoadedTickets(true);
            });

        return () => {
            active = false;
        };
    }, []);

    const filtered = showUsedOnly
        ? tickets.filter((tk) => tk.usageStatus === "USED")
        : tickets;

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

                    {hasLoadedTickets && filtered.length === 0 ? (
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
