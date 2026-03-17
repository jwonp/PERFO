"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

type TicketStatus = "BEFORE_USE" | "WAITING" | "MY_TURN" | "USED";

interface Ticket {
    id: string;
    name: string;
    ticketNumber: number;
    venue: string;
    validDate: string;
    status: TicketStatus;
    imageUrl?: string;
}

const MOCK_TICKETS: Ticket[] = [
    {
        id: "1",
        name: "PERFO Summer Festival",
        ticketNumber: 42,
        venue: "올림픽공원 체조경기장",
        validDate: "2026.08.15",
        status: "MY_TURN",
        imageUrl: "https://picsum.photos/seed/concert1/600/300",
    },
    {
        id: "2",
        name: "Jazz Night Live",
        ticketNumber: 17,
        venue: "블루스퀘어 마스터카드홀",
        validDate: "2026.07.20",
        status: "WAITING",
        imageUrl: "https://picsum.photos/seed/jazz2/600/300",
    },
    {
        id: "3",
        name: "Art Exhibition 2026",
        ticketNumber: 5,
        venue: "국립현대미술관",
        validDate: "2026.06.01",
        status: "BEFORE_USE",
        imageUrl: "https://picsum.photos/seed/art3/600/300",
    },
    {
        id: "4",
        name: "K-Pop Concert",
        ticketNumber: 88,
        venue: "KSPO DOME",
        validDate: "2026.05.10",
        status: "USED",
        imageUrl: "https://picsum.photos/seed/kpop4/600/300",
    },
];

function statusLabel(status: TicketStatus, t: ReturnType<typeof useTranslations>): string {
    const map: Record<TicketStatus, string> = {
        BEFORE_USE: t("reserved.statusBeforeUse"),
        WAITING: t("reserved.statusWaiting"),
        MY_TURN: t("reserved.statusMyTurn"),
        USED: t("reserved.statusUsed"),
    };
    return map[status];
}

function statusColor(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
        BEFORE_USE: "bg-perfo-secondary/30 text-perfo-primary",
        WAITING: "bg-yellow-100 text-yellow-700",
        MY_TURN: "bg-green-100 text-green-700",
        USED: "bg-gray-100 text-gray-500",
    };
    return map[status];
}

function QRIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M14 21h2" />
        </svg>
    );
}

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

function TicketCard({ ticket, t }: { ticket: Ticket; t: ReturnType<typeof useTranslations> }) {
    const isUsed = ticket.status === "USED";

    return (
        <div className="relative rounded-2xl overflow-hidden shadow-md h-36">
            {/* Background image */}
            {ticket.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={ticket.imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
            )}

            {/* Dark overlay — 사용 완료 시 더 진하게 */}
            <div className={`absolute inset-0 ${isUsed ? "bg-black/70" : "bg-black/50"}`} />

            <div className="relative h-full flex flex-col justify-between p-4">
                {/* Top: status badge */}
                <span className={`self-start text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColor(ticket.status)}`}>
                    {statusLabel(ticket.status, t)}
                </span>

                {/* Bottom: info + QR button */}
                <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                        <h3 className="text-white font-bold text-base leading-tight">
                            {ticket.name}
                        </h3>
                        <p className="text-white/60 text-xs">
                            No. {String(ticket.ticketNumber).padStart(4, "0")}
                        </p>
                        <p className="text-white/70 text-xs flex items-center gap-1 pt-0.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            {ticket.venue}
                        </p>
                        <p className="text-white/70 text-xs flex items-center gap-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {ticket.validDate}
                        </p>
                    </div>

                    {!isUsed && (
                        <button
                            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors shrink-0"
                            aria-label="QR 코드 보기"
                        >
                            <QRIcon />
                            QR
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ReservedPage() {
    const t = useTranslations();
    const [showUsedOnly, setShowUsedOnly] = useState(false);

    const filtered = showUsedOnly
        ? MOCK_TICKETS.filter((tk) => tk.status === "USED")
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
                    <div className="space-y-3">
                        {filtered.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} t={t} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
