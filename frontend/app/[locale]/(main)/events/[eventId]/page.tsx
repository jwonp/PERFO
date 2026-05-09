"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

type EventDetail = {
    id: string;
    name: string;
    venue: string;
    saleOpenAt: string;
    saleCloseAt: string;
    remainingQuantity: number;
    totalQuantity: number;
    maxPerUser: number;
    discoveryMode: "LISTED" | "LINK_ONLY";
    saleStatus: "UPCOMING" | "OPEN" | "SOLD_OUT" | "CLOSED" | "INACTIVE";
};

const saleStatusLabel = (status: EventDetail["saleStatus"], t: ReturnType<typeof useTranslations>) => {
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

const EventDetailPage = ({
    params,
}: {
    params: { eventId: string };
}) => {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    useEffect(() => {
        let active = true;

        void fetch(`/api/events/${params.eventId}`, { cache: "no-store" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("failed");
                }
                return response.json();
            })
            .then((item: Record<string, unknown>) => {
                if (!active) {
                    return;
                }

                setEvent({
                    id: String(item.id),
                    name: String(item.name),
                    venue: String(item.venue),
                    saleOpenAt: String(item.saleOpenAt),
                    saleCloseAt: String(item.saleCloseAt),
                    remainingQuantity: Number(item.remainingQuantity ?? 0),
                    totalQuantity: Number(item.totalQuantity ?? 0),
                    maxPerUser: Number(item.maxPerUser ?? 1),
                    discoveryMode: String(item.discoveryMode ?? "LISTED") as EventDetail["discoveryMode"],
                    saleStatus: String(item.saleStatus ?? "INACTIVE") as EventDetail["saleStatus"],
                });
            })
            .catch(() => {
                if (!active) {
                    return;
                }
                setError(t("events.detailLoadError"));
            });

        return () => {
            active = false;
        };
    }, [params.eventId, t]);

    const handleBook = async () => {
        if (!event) {
            return;
        }

        setIsBooking(true);
        setError(null);

        try {
            const response = await fetch("/api/ticketing/requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    requestId: crypto.randomUUID(),
                    eventId: Number(event.id),
                    quantity: 1,
                }),
            });
            if (!response.ok) {
                throw new Error("failed");
            }
            router.push(`/${locale}/reserved`);
        } catch {
            setError(t("events.bookingFailed"));
        } finally {
            setIsBooking(false);
        }
    };

    if (!event && !error) {
        return <PageShell className="ds-shell" />;
    }

    return (
        <PageShell className="ds-shell">
            <div className="px-5 pt-8 pb-28">
                <PageSection spacing="lg">
                    {event ? (
                        <article className="rounded-3xl border border-border bg-[var(--surface-raised)] px-5 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-semibold text-primary">{event.name}</h1>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">{event.venue}</p>
                                </div>
                                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                                    {saleStatusLabel(event.saleStatus, t)}
                                </span>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-[var(--text)]">
                                <p>{t("events.remaining", { remaining: event.remainingQuantity, total: event.totalQuantity })}</p>
                                <p>{t("events.detailMetaVenue")}: {event.venue}</p>
                                <p>{t("events.detailMetaOpen")}: {event.saleOpenAt}</p>
                                <p>{t("events.detailMetaClose")}: {event.saleCloseAt}</p>
                                <p>{t("events.detailMetaLimit")}: {event.maxPerUser}</p>
                                <p>
                                    {t("events.detailMetaDiscovery")}:{" "}
                                    {event.discoveryMode === "LISTED" ? t("events.discoveryListed") : t("events.discoveryLinkOnly")}
                                </p>
                            </div>

                            <Button className="mt-6 h-12 w-full rounded-xl" onClick={() => void handleBook()} disabled={isBooking}>
                                {isBooking ? t("events.booking") : t("events.bookNow")}
                            </Button>
                        </article>
                    ) : null}
                    {error ? (
                        <p className="text-sm text-[var(--danger)]">{error}</p>
                    ) : null}
                </PageSection>
            </div>
        </PageShell>
    );
};

export default EventDetailPage;
