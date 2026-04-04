"use client";

/** 발급된 티켓의 사용 상태 — storyboard.md 3.1 */
export type TicketUsageStatus = "BEFORE_USE" | "WAITING" | "MY_TURN" | "USED";

export interface TicketCardProps {
    name: string;
    venue: string;
    validDate: string;
    imageUrl?: string;
    usageStatus: TicketUsageStatus;
    ticketNumber: number;
    totalCount: number;
}

const STATUS_META: Record<
    TicketUsageStatus,
    { label: string; badge: string; dateSuffix: string }
> = {
    BEFORE_USE: {
        label: "BEFORE SERVING",
        badge: "bg-[#EEF3FF] text-perfo-primary",
        dateSuffix: "오픈",
    },
    WAITING: {
        label: "WAITING",
        badge: "bg-yellow-50 text-yellow-600",
        dateSuffix: "오픈",
    },
    MY_TURN: {
        label: "NOW SERVING",
        badge: "bg-[#E6F7F0] text-emerald-600",
        dateSuffix: "까지 유효",
    },
    USED: {
        label: "EXPIRED",
        badge: "bg-gray-100 text-gray-400",
        dateSuffix: "만료",
    },
};

function PinIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function QRScanIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M14 21h2" />
        </svg>
    );
}

export function TicketCard({
    name,
    venue,
    validDate,
    imageUrl,
    usageStatus,
    ticketNumber,
    totalCount,
}: TicketCardProps) {
    const meta = STATUS_META[usageStatus];
    const isNowServing = usageStatus === "MY_TURN";
    const isExpired = usageStatus === "USED";

    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {/* 이미지 영역 */}
            <div className="relative w-full aspect-video overflow-hidden">
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={name}
                        className={`w-full h-full object-cover ${isExpired ? "grayscale opacity-60" : ""}`}
                    />
                ) : (
                    <div className="w-full h-full bg-perfo-secondary/20" />
                )}
            </div>

            {/* 정보 영역 */}
            <div className="px-4 pt-3 pb-4 space-y-2">
                {/* 상태 뱃지 */}
                <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}>
                    {meta.label}
                </span>

                {/* 티켓 이름 */}
                <p className="font-bold text-perfo-text text-[15px] leading-snug">{name}</p>

                {/* 장소 */}
                <p className="text-perfo-text/50 text-xs flex items-center gap-1.5">
                    <PinIcon />
                    {venue}
                </p>

                {/* 날짜 */}
                <p className="text-perfo-text/50 text-xs flex items-center gap-1.5">
                    <CalendarIcon />
                    {validDate} {meta.dateSuffix}
                </p>

                {/* 발급 수 */}
                <div className="flex justify-end pt-1">
                    <span className="text-sm font-semibold text-perfo-primary">
                        {ticketNumber}{" "}
                        <span className="text-perfo-text/30 font-normal">/ {totalCount}</span>
                    </span>
                </div>
            </div>

            {/* QR 스캔 버튼 — NOW SERVING 상태에서만 표시 */}
            {isNowServing && (
                <div className="px-4 pb-4">
                    <button className="w-full flex items-center justify-center gap-2 bg-perfo-primary hover:bg-perfo-primary-hover text-white text-sm font-semibold py-3 rounded-xl transition-colors">
                        <QRScanIcon />
                        QR 스캔
                    </button>
                </div>
            )}
        </div>
    );
}
