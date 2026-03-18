"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type IssueStatus = "ISSUING" | "INACTIVE" | "EXPIRED" | "VERIFYING";

interface IssuedTicket {
    id: string;
    name: string;
    venue: string;
    validDate: string;
    status: IssueStatus;
    issuedCount: number;
    totalCount: number;
    allowDuplicate: boolean;
    maxPerUser: number;
}

const INITIAL_MOCK: IssuedTicket[] = [
    {
        id: "1",
        name: "PERFO Summer Festival",
        venue: "올림픽공원 체조경기장",
        validDate: "2026-08-15",
        status: "ISSUING",
        issuedCount: 342,
        totalCount: 500,
        allowDuplicate: false,
        maxPerUser: 1,
    },
    {
        id: "2",
        name: "Jazz Night Live",
        venue: "블루스퀘어 마스터카드홀",
        validDate: "2026-07-20",
        status: "VERIFYING",
        issuedCount: 150,
        totalCount: 150,
        allowDuplicate: false,
        maxPerUser: 1,
    },
    {
        id: "3",
        name: "Art Exhibition 2026",
        venue: "국립현대미술관",
        validDate: "2026-06-01",
        status: "INACTIVE",
        issuedCount: 0,
        totalCount: 200,
        allowDuplicate: true,
        maxPerUser: 2,
    },
    {
        id: "4",
        name: "Winter Concert Series",
        venue: "예술의전당 콘서트홀",
        validDate: "2025-12-31",
        status: "EXPIRED",
        issuedCount: 80,
        totalCount: 100,
        allowDuplicate: false,
        maxPerUser: 1,
    },
];

interface TicketForm {
    name: string;
    venue: string;
    validDate: string;
    totalCount: string;
    allowDuplicate: boolean;
    maxPerUser: string;
}

const EMPTY_FORM: TicketForm = {
    name: "",
    venue: "",
    validDate: "",
    totalCount: "",
    allowDuplicate: false,
    maxPerUser: "1",
};

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

function PencilIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                checked ? "bg-perfo-primary" : "bg-perfo-secondary/30"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

function IssuedTicketCard({
    ticket,
    t,
    onEdit,
}: {
    ticket: IssuedTicket;
    t: ReturnType<typeof useTranslations>;
    onEdit: (ticket: IssuedTicket) => void;
}) {
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

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => onEdit(ticket)}
                        className="flex items-center gap-1 text-perfo-secondary hover:text-perfo-primary border border-perfo-secondary/30 hover:border-perfo-primary px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
                        aria-label="티켓 수정"
                    >
                        <PencilIcon />
                        {t("myTickets.edit")}
                    </button>

                    {(ticket.status === "ISSUING" || ticket.status === "VERIFYING") && (
                        <button
                            className="flex items-center gap-1.5 bg-perfo-primary text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-perfo-primary-hover transition-colors"
                            aria-label="QR 검표"
                        >
                            <ScanIcon />
                            {t("myTickets.scan")}
                        </button>
                    )}
                </div>
            </div>

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

function TicketFormSheet({
    open,
    editTarget,
    onClose,
    onSubmit,
    t,
}: {
    open: boolean;
    editTarget: IssuedTicket | null;
    onClose: () => void;
    onSubmit: (form: TicketForm) => void;
    t: ReturnType<typeof useTranslations>;
}) {
    const isEdit = editTarget !== null;
    const [form, setForm] = useState<TicketForm>(() =>
        editTarget
            ? {
                  name: editTarget.name,
                  venue: editTarget.venue,
                  validDate: editTarget.validDate,
                  totalCount: String(editTarget.totalCount),
                  allowDuplicate: editTarget.allowDuplicate,
                  maxPerUser: String(editTarget.maxPerUser),
              }
            : EMPTY_FORM
    );

    // editTarget 변경 시 폼 초기화
    const [prevTarget, setPrevTarget] = useState(editTarget);
    if (prevTarget !== editTarget) {
        setPrevTarget(editTarget);
        setForm(
            editTarget
                ? {
                      name: editTarget.name,
                      venue: editTarget.venue,
                      validDate: editTarget.validDate,
                      totalCount: String(editTarget.totalCount),
                      allowDuplicate: editTarget.allowDuplicate,
                      maxPerUser: String(editTarget.maxPerUser),
                  }
                : EMPTY_FORM
        );
    }

    const set = (key: keyof TicketForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-perfo-secondary/30 rounded-full" />
                </div>

                <div className="px-5 pb-8 pt-2">
                    <h2 className="text-base font-bold text-perfo-text mb-5">
                        {isEdit ? t("myTickets.editTitle") : t("myTickets.createTitle")}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 티켓 이름 */}
                        <div className="space-y-1.5">
                            <Label className="text-perfo-text/70 text-xs">{t("myTickets.fieldName")}</Label>
                            <Input
                                required
                                value={form.name}
                                onChange={set("name")}
                                placeholder={t("myTickets.fieldNamePlaceholder")}
                                className="h-11 rounded-xl border-perfo-secondary/40 focus-visible:border-perfo-primary focus-visible:ring-perfo-primary/20"
                            />
                        </div>

                        {/* 장소 */}
                        <div className="space-y-1.5">
                            <Label className="text-perfo-text/70 text-xs">{t("myTickets.fieldVenue")}</Label>
                            <Input
                                required
                                value={form.venue}
                                onChange={set("venue")}
                                placeholder={t("myTickets.fieldVenuePlaceholder")}
                                className="h-11 rounded-xl border-perfo-secondary/40 focus-visible:border-perfo-primary focus-visible:ring-perfo-primary/20"
                            />
                        </div>

                        {/* 유효 날짜 */}
                        <div className="space-y-1.5">
                            <Label className="text-perfo-text/70 text-xs">{t("myTickets.fieldDate")}</Label>
                            <Input
                                required
                                type="date"
                                value={form.validDate}
                                onChange={set("validDate")}
                                className="h-11 rounded-xl border-perfo-secondary/40 focus-visible:border-perfo-primary focus-visible:ring-perfo-primary/20"
                            />
                        </div>

                        {/* 총 티켓 수 */}
                        <div className="space-y-1.5">
                            <Label className="text-perfo-text/70 text-xs">{t("myTickets.fieldTotal")}</Label>
                            <Input
                                required
                                type="number"
                                min="1"
                                value={form.totalCount}
                                onChange={set("totalCount")}
                                placeholder="100"
                                className="h-11 rounded-xl border-perfo-secondary/40 focus-visible:border-perfo-primary focus-visible:ring-perfo-primary/20"
                            />
                        </div>

                        {/* 중복 구매 허용 */}
                        <div className="flex items-center justify-between bg-perfo-bg rounded-xl px-4 py-3">
                            <Label className="text-sm font-medium text-perfo-text cursor-pointer">
                                {t("myTickets.fieldAllowDuplicate")}
                            </Label>
                            <Toggle
                                checked={form.allowDuplicate}
                                onToggle={() => setForm((f) => ({ ...f, allowDuplicate: !f.allowDuplicate }))}
                            />
                        </div>

                        {/* 1인당 최대 수량 (중복 허용 시에만 노출) */}
                        {form.allowDuplicate && (
                            <div className="space-y-1.5">
                                <Label className="text-perfo-text/70 text-xs">{t("myTickets.fieldMaxPerUser")}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.maxPerUser}
                                    onChange={set("maxPerUser")}
                                    placeholder="2"
                                    className="h-11 rounded-xl border-perfo-secondary/40 focus-visible:border-perfo-primary focus-visible:ring-perfo-primary/20"
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-perfo-secondary/40 text-perfo-text"
                                onClick={onClose}
                            >
                                {t("myTickets.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 rounded-xl bg-perfo-primary hover:bg-perfo-primary-hover"
                            >
                                {isEdit ? t("myTickets.save") : t("myTickets.create")}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default function MyTicketsPage() {
    const t = useTranslations();
    const [tickets, setTickets] = useState<IssuedTicket[]>(INITIAL_MOCK);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<IssuedTicket | null>(null);

    const openCreate = () => {
        setEditTarget(null);
        setSheetOpen(true);
    };

    const openEdit = (ticket: IssuedTicket) => {
        setEditTarget(ticket);
        setSheetOpen(true);
    };

    const handleClose = () => setSheetOpen(false);

    const handleSubmit = (form: TicketForm) => {
        if (editTarget) {
            setTickets((prev) =>
                prev.map((tk) =>
                    tk.id === editTarget.id
                        ? {
                              ...tk,
                              name: form.name,
                              venue: form.venue,
                              validDate: form.validDate,
                              totalCount: Number(form.totalCount),
                              allowDuplicate: form.allowDuplicate,
                              maxPerUser: Number(form.maxPerUser),
                          }
                        : tk
                )
            );
        } else {
            const newTicket: IssuedTicket = {
                id: String(Date.now()),
                name: form.name,
                venue: form.venue,
                validDate: form.validDate,
                status: "INACTIVE",
                issuedCount: 0,
                totalCount: Number(form.totalCount),
                allowDuplicate: form.allowDuplicate,
                maxPerUser: Number(form.maxPerUser),
            };
            setTickets((prev) => [newTicket, ...prev]);
        }
        setSheetOpen(false);
    };

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
                {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-perfo-secondary/60">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-14 h-14 mb-3">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                            <polyline points="9 12 11 14 15 10" />
                        </svg>
                        <p className="text-sm">{t("myTickets.empty")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {tickets.map((ticket) => (
                            <IssuedTicketCard key={ticket.id} ticket={ticket} t={t} onEdit={openEdit} />
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={openCreate}
                className="fixed bottom-24 right-5 w-14 h-14 bg-perfo-primary hover:bg-perfo-primary-hover text-white rounded-full shadow-lg shadow-perfo-primary/30 flex items-center justify-center transition-colors z-30"
                aria-label="티켓 발급"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            {/* Create / Edit Sheet */}
            <TicketFormSheet
                open={sheetOpen}
                editTarget={editTarget}
                onClose={handleClose}
                onSubmit={handleSubmit}
                t={t}
            />
        </div>
    );
}
