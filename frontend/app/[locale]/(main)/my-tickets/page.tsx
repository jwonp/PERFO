"use client";

import { useTranslations } from "next-intl";

type IssueStatus = "ISSUING" | "INACTIVE" | "EXPIRED" | "VERIFYING";

interface IssuedTicket {
    id: string;
    name: string;
    venue: string;
    validDate: string;
    status: IssueStatus;
    issuedCount: number;
    totalCount: number;
}

const MOCK_ISSUED: IssuedTicket[] = [
    {
        id: "1",
        name: "PERFO Summer Festival",
        venue: "올림픽공원 체조경기장",
        validDate: "2026.08.15",
        status: "ISSUING",
        issuedCount: 342,
        totalCount: 500,
    },
    {
        id: "2",
        name: "Jazz Night Live",
        venue: "블루스퀘어 마스터카드홀",
        validDate: "2026.07.20",
        status: "VERIFYING",
        issuedCount: 150,
        totalCount: 150,
    },
    {
        id: "3",
        name: "Art Exhibition 2026",
        venue: "국립현대미술관",
        validDate: "2026.06.01",
        status: "INACTIVE",
        issuedCount: 0,
        totalCount: 200,
    },
    {
        id: "4",
        name: "Winter Concert Series",
        venue: "예술의전당 콘서트홀",
        validDate: "2025.12.31",
        status: "EXPIRED",
        issuedCount: 80,
        totalCount: 100,
    },
];

function statusLabel(status: IssueStatus, t: ReturnType<typeof useTranslations>): string {
    const map: Record<IssueStatus, string> = {
        ISSUING: t("myTickets.statusIssuing"),
        INACTIVE: t("myTickets.statusInactive"),
        EXPIRED: t("myTickets.statusExpired"),
        VERIFYING: t("myTickets.statusVerifying"),
    };
    return map[status];
}

function statusBadgeStyle(status: IssueStatus): string {
    const map: Record<IssueStatus, string> = {
        ISSUING: "bg-green-100 text-green-700",
        INACTIVE: "bg-gray-100 text-gray-500",
        EXPIRED: "bg-red-100 text-red-500",
        VERIFYING: "bg-blue-100 text-perfo-primary",
    };
    return map[status];
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

function ScanIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
    );
}

function IssuedTicketCard({ ticket, t }: { ticket: IssuedTicket; t: ReturnType<typeof useTranslations> }) {
    const progressPct = Math.round((ticket.issuedCount / ticket.totalCount) * 100);

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-perfo-secondary/10">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                    <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2 ${statusBadgeStyle(ticket.status)}`}>
                        {statusLabel(ticket.status, t)}
                    </span>
                    <h3 className="font-bold text-perfo-text text-sm leading-tight truncate">{ticket.name}</h3>
                </div>

                {(ticket.status === "ISSUING" || ticket.status === "VERIFYING") && (
                    <button
                        className="flex items-center gap-1.5 bg-perfo-primary text-white text-xs font-medium px-3 py-2 rounded-xl shrink-0 hover:bg-perfo-primary-hover transition-colors"
                        aria-label="QR 검표"
                    >
                        <ScanIcon />
                        {t("myTickets.scan")}
                    </button>
                )}
            </div>

            {/* Venue & Date */}
            <div className="space-y-1 mb-3">
                <p className="text-perfo-text/60 text-xs flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    {ticket.venue}
                </p>
                <p className="text-perfo-text/60 text-xs flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {ticket.validDate}
                </p>
            </div>

            {/* Progress bar */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-perfo-text/50">{t("myTickets.issuedCount")}</span>
                    <span className="text-xs font-semibold text-perfo-primary">
                        {ticket.issuedCount} / {ticket.totalCount}
                    </span>
                </div>
                <div className="h-1.5 bg-perfo-secondary/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-perfo-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function MyTicketsPage() {
    const t = useTranslations();

    return (
        <div className="min-h-full bg-perfo-bg">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b border-perfo-secondary/10">
                <h1 className="text-lg font-bold text-perfo-primary">{t("myTickets.title")}</h1>
                <div className="flex items-center gap-3 text-perfo-secondary">
                    <button aria-label="검색" className="hover:text-perfo-primary transition-colors">
                        <SearchIcon />
                    </button>
                    <button aria-label="알림" className="hover:text-perfo-primary transition-colors">
                        <BellIcon />
                    </button>
                </div>
            </div>

            <div className="px-5 py-4 space-y-3">
                {MOCK_ISSUED.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-perfo-secondary/60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 mb-3">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                            <polyline points="9 12 11 14 15 10" />
                        </svg>
                        <p className="text-sm">{t("myTickets.empty")}</p>
                    </div>
                ) : (
                    MOCK_ISSUED.map((ticket) => (
                        <IssuedTicketCard key={ticket.id} ticket={ticket} t={t} />
                    ))
                )}
            </div>
        </div>
    );
}
