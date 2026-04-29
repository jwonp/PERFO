"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useState } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import PageEmptyState from "@/components/layout/PageEmptyState";
import PageFab from "@/components/layout/PageFab";
import PageFilterBar from "@/components/layout/PageFilterBar";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { useNotificationSnapshotBootstrap } from "@/components/notifications/use-notification-snapshot-bootstrap";
import { IssuedTicketCard } from "@/components/tickets/IssuedTicketCard";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FormField, FormFieldLabel } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ToggleRow } from "@/components/ui/toggle-row";
import { PlaceAutocompleteInput, googleMapsSearchUrl } from "./PlaceAutocompleteInput";
import { EMPTY_FORM, INITIAL_MOCK, STATUS_BADGE_STYLE } from "./my-tickets.constants";
import type { IssuedTicket, IssueStatus, TicketForm, TicketFormSheetProps } from "./my-tickets.types";

const statusLabel = (status: IssueStatus, t: ReturnType<typeof useTranslations>): string => {
    const map: Record<IssueStatus, string> = {
        ISSUING: t("myTickets.statusIssuing"),
        INACTIVE: t("myTickets.statusInactive"),
        EXPIRED: t("myTickets.statusExpired"),
        VERIFYING: t("myTickets.statusVerifying"),
    };
    return map[status];
};

const statusBadgeStyle = (status: IssueStatus) => STATUS_BADGE_STYLE[status];

const TicketFormSheet = ({
    open,
    editTarget,
    onClose,
    onSubmit,
    t,
}: TicketFormSheetProps) => {
    const isEdit = editTarget !== null;
    const [form, setForm] = useState<TicketForm>(() =>
        editTarget
            ? {
                  name: editTarget.name,
                  venue: editTarget.venue,
                  googlePlaceId: editTarget.googlePlaceId ?? "",
                  detailAddress: editTarget.detailAddress,
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
                      googlePlaceId: editTarget.googlePlaceId ?? "",
                      detailAddress: editTarget.detailAddress,
                      validDate: editTarget.validDate,
                      totalCount: String(editTarget.totalCount),
                      allowDuplicate: editTarget.allowDuplicate,
                      maxPerUser: String(editTarget.maxPerUser),
                  }
                : EMPTY_FORM
        );
    }

    const set = (key: keyof TicketForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({
            ...f,
            [key]: e.target.value,
            ...(key === "venue" ? { googlePlaceId: "" } : {}),
        }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    if (!open) return null;

    return (
        <BottomSheet open={open} onClose={onClose}>
            <BottomSheetContent>
                <BottomSheetTitle>
                    {isEdit ? t("myTickets.editTitle") : t("myTickets.createTitle")}
                </BottomSheetTitle>

                <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField>
                            <FormFieldLabel htmlFor="ticket-name">{t("myTickets.fieldName")}</FormFieldLabel>
                            <Input
                                id="ticket-name"
                                required
                                value={form.name}
                                onChange={set("name")}
                                placeholder={t("myTickets.fieldNamePlaceholder")}
                                className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                            />
                        </FormField>

                        <FormField>
                            <FormFieldLabel htmlFor="ticket-venue">{t("myTickets.fieldVenue")}</FormFieldLabel>
                            <PlaceAutocompleteInput
                                id="ticket-venue"
                                required
                                value={form.venue}
                                placeId={form.googlePlaceId}
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, venue: value, googlePlaceId: "" }))
                                }
                                onPlaceSelect={(place) =>
                                    setForm((f) => ({
                                        ...f,
                                        venue: place.name,
                                        googlePlaceId: place.placeId ?? "",
                                    }))
                                }
                                placeholder={t("myTickets.fieldVenuePlaceholder")}
                                unavailableLabel={t("myTickets.placeAutocompleteUnavailable")}
                                selectedLabel={t("myTickets.placeAutocompleteSelected")}
                            />
                        </FormField>

                        <FormField>
                            <FormFieldLabel htmlFor="ticket-detail-address">{t("myTickets.fieldDetailAddress")}</FormFieldLabel>
                            <Input
                                id="ticket-detail-address"
                                value={form.detailAddress}
                                onChange={set("detailAddress")}
                                placeholder={t("myTickets.fieldDetailAddressPlaceholder")}
                                className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                            />
                        </FormField>

                        <FormField>
                            <FormFieldLabel htmlFor="ticket-valid-date">{t("myTickets.fieldDate")}</FormFieldLabel>
                            <Input
                                id="ticket-valid-date"
                                required
                                type="date"
                                value={form.validDate}
                                onChange={set("validDate")}
                                className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                            />
                        </FormField>

                        <FormField>
                            <FormFieldLabel htmlFor="ticket-total-count">{t("myTickets.fieldTotal")}</FormFieldLabel>
                            <Input
                                id="ticket-total-count"
                                required
                                type="number"
                                min="1"
                                value={form.totalCount}
                                onChange={set("totalCount")}
                                placeholder="100"
                                className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                            />
                        </FormField>

                        <div className="rounded-xl bg-[var(--surface-muted)] px-4">
                            <ToggleRow
                                checked={form.allowDuplicate}
                                label={t("myTickets.fieldAllowDuplicate")}
                                onToggle={() => setForm((f) => ({ ...f, allowDuplicate: !f.allowDuplicate }))}
                                labelClassName="cursor-pointer"
                            />
                        </div>

                        {form.allowDuplicate && (
                            <FormField>
                                <FormFieldLabel htmlFor="ticket-max-per-user">{t("myTickets.fieldMaxPerUser")}</FormFieldLabel>
                                <Input
                                    id="ticket-max-per-user"
                                type="number"
                                min="1"
                                value={form.maxPerUser}
                                onChange={set("maxPerUser")}
                                placeholder="2"
                                className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                            />
                        </FormField>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-border text-[var(--text)]"
                                onClick={onClose}
                            >
                                {t("myTickets.cancel")}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 rounded-xl"
                            >
                                {isEdit ? t("myTickets.save") : t("myTickets.create")}
                            </Button>
                        </div>
                </form>
            </BottomSheetContent>
        </BottomSheet>
    );
};

const MyTicketsPage = () => {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
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
                              detailAddress: form.detailAddress,
                              googleMapsUrl: googleMapsSearchUrl(form.venue, form.googlePlaceId),
                              googlePlaceId: form.googlePlaceId,
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
                detailAddress: form.detailAddress,
                googleMapsUrl: googleMapsSearchUrl(form.venue, form.googlePlaceId),
                googlePlaceId: form.googlePlaceId,
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

    useNotificationSnapshotBootstrap(
        tickets.map((ticket) => ({
            scope: "issued",
            ticketId: ticket.id,
            ticketName: ticket.name,
            targetUrl: `/${locale}/my-tickets/${ticket.id}/scan`,
            statuses: [
                {
                    statusKey: "issueStatus",
                    statusValue: ticket.status,
                },
            ],
        })),
    );

    return (
        <PageShell className="min-h-full ds-shell">
            <div className="px-5 pt-8">
                <PageSection spacing="lg">
                    <PageHeader
                        title={t("myTickets.title")}
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
                        <Button className="h-9 rounded-full px-4 text-xs">
                            {t("myTickets.title")}
                        </Button>
                        <Button variant="outline" className="h-9 rounded-full border-primary/30 px-4 text-xs text-primary shadow-none">
                            {t("myTickets.fieldAllowDuplicate")}
                            <SlidersHorizontal className="size-3.5" />
                        </Button>
                    </PageFilterBar>
                </PageSection>
            </div>

            <div className="space-y-3 px-5 pt-5 pb-28">
                {tickets.length === 0 ? (
                    <PageEmptyState
                        title={t("myTickets.empty")}
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                            <polyline points="9 12 11 14 15 10" />
                        </svg>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {tickets.map((ticket) => (
                            <IssuedTicketCard
                                key={ticket.id}
                                ticket={ticket}
                                statusLabel={statusLabel(ticket.status, t)}
                                badgeVariant={statusBadgeStyle(ticket.status)}
                                issuedCountLabel={t("myTickets.issuedCount")}
                                editLabel={t("myTickets.edit")}
                                scanLabel={t("myTickets.scan")}
                                canScan={ticket.status === "ISSUING" || ticket.status === "VERIFYING"}
                                onEdit={() => openEdit(ticket)}
                                onScan={() => router.push(`/${locale}/my-tickets/${ticket.id}/scan`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <PageFab
                onClick={openCreate}
                aria-label="티켓 발급"
            >
                <Plus className="size-6" />
            </PageFab>

            {/* Create / Edit Sheet */}
            <TicketFormSheet
                open={sheetOpen}
                editTarget={editTarget}
                onClose={handleClose}
                onSubmit={handleSubmit}
                t={t}
            />
        </PageShell>
    );
};

export default MyTicketsPage;
