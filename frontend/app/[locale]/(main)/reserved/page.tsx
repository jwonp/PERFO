"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { TicketCard } from "@/components/tickets/TicketCard";
import type { TicketUsageStatus } from "@/components/tickets/TicketCard";

/** 티켓 구매 프로세스 상태 (Kafka → WebSocket 실시간) — ARCHITECTURE.md 6.2 */
type TicketingStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "SOLD_OUT" | "DUPLICATE";

interface Ticket {
    id: string;
    name: string;
    ticketNumber: number;
    totalCount: number;
    venue: string;
    validDate: string;
    ticketingStatus: TicketingStatus;
    usageStatus: TicketUsageStatus;
    imageUrl?: string;
}

const MOCK_TICKETS: Ticket[] = [
    {
        id: "1",
        name: "PERFO Summer Festival",
        ticketNumber: 42,
        totalCount: 500,
        venue: "올림픽공원 체조경기장",
        validDate: "2026.08.15",
        ticketingStatus: "SUCCESS",
        usageStatus: "MY_TURN",
        imageUrl: "https://picsum.photos/seed/concert1/600/300",
    },
    {
        id: "2",
        name: "Jazz Night Live",
        ticketNumber: 17,
        totalCount: 300,
        venue: "블루스퀘어 마스터카드홀",
        validDate: "2026.07.20",
        ticketingStatus: "SUCCESS",
        usageStatus: "WAITING",
        imageUrl: "https://picsum.photos/seed/jazz2/600/300",
    },
    {
        id: "3",
        name: "Art Exhibition 2026",
        ticketNumber: 5,
        totalCount: 200,
        venue: "국립현대미술관",
        validDate: "2026.06.01",
        ticketingStatus: "SUCCESS",
        usageStatus: "BEFORE_USE",
        imageUrl: "https://picsum.photos/seed/art3/600/300",
    },
    {
        id: "4",
        name: "K-Pop Concert",
        ticketNumber: 88,
        totalCount: 1000,
        venue: "KSPO DOME",
        validDate: "2026.05.10",
        ticketingStatus: "SUCCESS",
        usageStatus: "USED",
        imageUrl: "https://picsum.photos/seed/kpop4/600/300",
    },
];

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}


export default function ReservedPage() {
    const t = useTranslations();
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    const filtered = showUsedOnly
        ? MOCK_TICKETS.filter((tk) => tk.usageStatus === "USED")
        : MOCK_TICKETS;

    return (
        <div className="min-h-full bg-perfo-bg">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b border-perfo-secondary/10">
                <h1 className="text-lg font-bold text-perfo-primary">{t("reserved.title")}</h1>
                <div className="flex items-center gap-3 text-perfo-secondary">
                    <button aria-label="검색" className="hover:text-perfo-primary transition-colors">
                        <SearchIcon />
                    </button>
                    <button aria-label="알림" className="hover:text-perfo-primary transition-colors">
                        <BellIcon />
                    </button>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                {/* Filter toggle */}
                <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
                    <span className="text-sm font-medium text-perfo-text">{t("reserved.showUsedOnly")}</span>
                    <button
                        role="switch"
                        aria-checked={showUsedOnly}
                        onClick={() => setShowUsedOnly((v) => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                            showUsedOnly ? "bg-perfo-primary" : "bg-perfo-secondary/30"
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                showUsedOnly ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* Ticket list */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-perfo-secondary/60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 mb-3">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                        </svg>
                        <p className="text-sm">{t("reserved.empty")}</p>
                    </div>
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
}
