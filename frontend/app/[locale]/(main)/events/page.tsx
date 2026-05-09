"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PageEmptyState from "@/components/layout/PageEmptyState";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";

type EventSummary = {
    id: string;
    name: string;
    venue: string;
    remainingQuantity: number;
    totalQuantity: number;
    saleStatus: "UPCOMING" | "OPEN" | "SOLD_OUT" | "CLOSED" | "INACTIVE";
    publicBookingPath?: string;
};

const saleStatusLabel = (status: EventSummary["saleStatus"], t: ReturnType<typeof useTranslations>) => {
    switch (status) {
        case "UPCOMING":
            return t("events.saleStatusUpcoming");
        case "OPEN":
            return t("events.saleStatusOpen");
        case "SOLD_OUT":
            return t("events.saleStatusSoldOut");
        case "CLOSED":
            return t("events.saleStatusClosed");
        default:
            return t("events.saleStatusInactive");
    }
};

const EventsPage = () => {
    const t = useTranslations();
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;

        void fetch("/api/events", { cache: "no-store" })
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

                setEvents(items.map((item) => ({
                    id: String(item.id),
                    name: String(item.name),
                    venue: String(item.venue),
                    remainingQuantity: Number(item.remainingQuantity ?? 0),
                    totalQuantity: Number(item.totalQuantity ?? 0),
                    saleStatus: String(item.saleStatus ?? "INACTIVE") as EventSummary["saleStatus"],
                    publicBookingPath: item.publicBookingPath ? String(item.publicBookingPath) : undefined,
                })));
                setLoaded(true);
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setLoaded(true);
            });

        return () => {
            active = false;
        };
    }, []);

    return (
        <PageShell className="ds-shell">
            <div className="px-5 pt-8 pb-28">
                <PageSection spacing="lg">
                    <PageHeader title={t("events.title")} />

                    {loaded && events.length === 0 ? (
                        <PageEmptyState title={t("events.empty")} />
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {events.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="rounded-3xl border border-border bg-[var(--surface-raised)] px-5 py-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-lg font-semibold text-primary">{event.name}</h2>
                                            <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{event.venue}</p>
                                        </div>
                                        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                                            {saleStatusLabel(event.saleStatus, t)}
                                        </span>
                                    </div>
                                    <p className="mt-4 text-sm text-[var(--text)]">
                                        {t("events.remaining", {
                                            remaining: event.remainingQuantity,
                                            total: event.totalQuantity,
                                        })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </PageSection>
            </div>
        </PageShell>
    );
};

export default EventsPage;
