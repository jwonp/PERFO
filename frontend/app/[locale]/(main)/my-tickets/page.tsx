"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Search } from "lucide-react";
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
import { Tabs, TabsButton } from "@/components/ui/tabs";
import { ToggleRow } from "@/components/ui/toggle-row";
import { PlaceAutocompleteInput, googleMapsSearchUrl } from "./PlaceAutocompleteInput";
import { EMPTY_FORM, STATUS_BADGE_STYLE } from "./my-tickets.constants";
import type { DuplicatePurchaseFilter, IssuedTicket, IssueStatus, TicketForm, TicketFormSheetProps } from "./my-tickets.types";

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

const toDateTimeLocalValue = (isoValue?: string): string => {
    if (!isoValue) {
        return "";
    }

    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 16);
};

const toIsoDateTime = (localValue: string): string | null => {
    if (!localValue) {
        return null;
    }

    const date = new Date(localValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
};

const isFutureVerifyingRequest = (status: IssueStatus, openAt: string): boolean => {
    const openAtIso = toIsoDateTime(openAt);
    if (status !== "VERIFYING" || !openAtIso) {
        return false;
    }

    return new Date(openAtIso).getTime() > Date.now();
};

const mapTicket = (item: Record<string, unknown>): IssuedTicket => ({
    id: String(item.id),
    name: String(item.name),
    venue: String(item.venue),
    detailAddress: String(item.detailAddress ?? ""),
    googleMapsUrl: googleMapsSearchUrl(String(item.venue), String(item.googlePlaceId)),
    googlePlaceId: String(item.googlePlaceId),
    validDate: String(item.validDate),
    openAt: String(item.openAt ?? ""),
    imageKey: item.imageKey ? String(item.imageKey) : undefined,
    imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
    status: item.status as IssueStatus,
    issuedCount: Number(item.issuedCount ?? 0),
    totalCount: Number(item.totalCount),
    allowDuplicate: Boolean(item.allowDuplicate),
    maxPerUser: Number(item.maxPerUser),
});

const TicketFormSheet = ({
    open,
    editTarget,
    onClose,
    onSubmit,
    t,
}: TicketFormSheetProps) => {
    const isEdit = editTarget !== null;
    const [form, setForm] = useState<TicketForm>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrorMessage(null);
        setIsSaving(false);
        setForm(
            editTarget
                ? {
                      name: editTarget.name,
                      venue: editTarget.venue,
                      googlePlaceId: editTarget.googlePlaceId ?? "",
                      detailAddress: editTarget.detailAddress,
                      validDate: editTarget.validDate,
                      openAt: toDateTimeLocalValue(editTarget.openAt),
                      totalCount: String(editTarget.totalCount),
                      allowDuplicate: editTarget.allowDuplicate,
                      maxPerUser: String(editTarget.maxPerUser),
                      status: editTarget.status,
                      imageKey: editTarget.imageKey,
                      imageUrl: editTarget.imageUrl,
                      imageFile: null,
                  }
                : EMPTY_FORM,
        );
    }, [editTarget, open]);

    const previewUrl = useMemo(() => {
        if (form.imageFile) {
            return URL.createObjectURL(form.imageFile);
        }

        return form.imageUrl;
    }, [form.imageFile, form.imageUrl]);

    useEffect(() => {
        if (!form.imageFile || !previewUrl) {
            return;
        }

        return () => {
            URL.revokeObjectURL(previewUrl);
        };
    }, [form.imageFile, previewUrl]);

    const set = (key: keyof TicketForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((currentForm) => ({
            ...currentForm,
            [key]: e.target.value,
            ...(key === "venue" ? { googlePlaceId: "" } : {}),
        }));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextFile = event.target.files?.[0] ?? null;
        setForm((currentForm) => ({
            ...currentForm,
            imageFile: nextFile,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMessage(null);

        try {
            await onSubmit(form);
            onClose();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : t("myTickets.saveFailed"));
        } finally {
            setIsSaving(false);
        }
    };

    if (!open) {
        return null;
    }

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
                                setForm((currentForm) => ({ ...currentForm, venue: value, googlePlaceId: "" }))
                            }
                            onPlaceSelect={(place) =>
                                setForm((currentForm) => ({
                                    ...currentForm,
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
                        <FormFieldLabel htmlFor="ticket-open-at">{t("myTickets.fieldOpenAt")}</FormFieldLabel>
                        <Input
                            id="ticket-open-at"
                            type="datetime-local"
                            value={form.openAt}
                            onChange={set("openAt")}
                            className="h-11 rounded-xl border-border focus-visible:border-ring focus-visible:ring-ring/20"
                        />
                    </FormField>

                    {isEdit ? (
                        <FormField>
                            <FormFieldLabel htmlFor="ticket-status">{t("myTickets.fieldStatus")}</FormFieldLabel>
                            <select
                                id="ticket-status"
                                value={form.status}
                                onChange={(event) =>
                                    setForm((currentForm) => ({
                                        ...currentForm,
                                        status: event.target.value as IssueStatus,
                                    }))
                                }
                                className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                            >
                                <option value="INACTIVE">{t("myTickets.statusInactive")}</option>
                                <option value="ISSUING">{t("myTickets.statusIssuing")}</option>
                                <option value="VERIFYING">{t("myTickets.statusVerifying")}</option>
                                <option value="EXPIRED">{t("myTickets.statusExpired")}</option>
                            </select>
                        </FormField>
                    ) : null}

                    {isFutureVerifyingRequest(form.status, form.openAt) ? (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{t("myTickets.verifyingFutureOpenAtWarning")}</span>
                            </div>
                        </div>
                    ) : null}

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
                            onToggle={() =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    allowDuplicate: !currentForm.allowDuplicate,
                                }))
                            }
                            labelClassName="cursor-pointer"
                        />
                    </div>

                    {form.allowDuplicate ? (
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
                    ) : null}

                    <FormField>
                        <FormFieldLabel htmlFor="ticket-image">{t("myTickets.fieldImage")}</FormFieldLabel>
                        <Input
                            id="ticket-image"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleFileChange}
                            className="h-auto rounded-xl border-border py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                        />
                        <p className="mt-2 text-xs text-[var(--text-muted)]">{t("myTickets.fieldImageHint")}</p>
                        {form.imageFile ? (
                            <p className="mt-2 text-xs font-medium text-primary">{form.imageFile.name}</p>
                        ) : null}
                        {previewUrl ? (
                            <div className="mt-3 overflow-hidden rounded-xl border border-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt={form.name || t("myTickets.fieldImage")}
                                    className="h-40 w-full object-cover"
                                />
                            </div>
                        ) : null}
                    </FormField>

                    {errorMessage ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </div>
                    ) : null}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 flex-1 rounded-xl border-border text-[var(--text)]"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            {t("myTickets.cancel")}
                        </Button>
                        <Button
                            type="submit"
                            className="h-12 flex-1 rounded-xl"
                            disabled={isSaving}
                        >
                            {isSaving
                                ? t("myTickets.saving")
                                : isEdit
                                    ? t("myTickets.save")
                                    : t("myTickets.create")}
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
    const [tickets, setTickets] = useState<IssuedTicket[]>([]);
    const [hasLoadedTickets, setHasLoadedTickets] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<IssuedTicket | null>(null);
    const [duplicateFilter, setDuplicateFilter] = useState<DuplicatePurchaseFilter>("ALL");

    const openCreate = () => {
        setEditTarget(null);
        setSheetOpen(true);
    };

    const openEdit = (ticket: IssuedTicket) => {
        setEditTarget(ticket);
        setSheetOpen(true);
    };

    const handleClose = () => setSheetOpen(false);

    const fetchJson = async (url: string, init?: RequestInit) => {
        const response = await fetch(url, init);
        const body = await response.json().catch(() => ({ message: "Request failed" }));

        if (!response.ok) {
            throw new Error(body.message ?? t("myTickets.saveFailed"));
        }

        return body as Record<string, unknown>;
    };

    const buildPayload = (form: TicketForm, imageKey?: string | null) => ({
        name: form.name,
        venue: form.venue,
        googlePlaceId: form.googlePlaceId,
        detailAddress: form.detailAddress,
        validDate: form.validDate,
        openAt: toIsoDateTime(form.openAt),
        totalCount: Number(form.totalCount),
        allowDuplicate: form.allowDuplicate,
        maxPerUser: Number(form.maxPerUser),
        status: form.status,
        imageKey: imageKey ?? form.imageKey ?? null,
    });

    const uploadImage = async (ticketId: string, file: File) => {
        const formData = new FormData();
        formData.set("file", file);

        return fetchJson(`/api/tickets/${ticketId}/image`, {
            method: "POST",
            body: formData,
        });
    };

    const cleanupImage = async (ticketId: string, imageKey: string) => {
        await fetch(`/api/tickets/${ticketId}/image?imageKey=${encodeURIComponent(imageKey)}`, {
            method: "DELETE",
        }).catch(() => undefined);
    };

    const handleSubmit = async (form: TicketForm) => {
        if (editTarget) {
            let imageKey = form.imageKey ?? null;

            if (form.imageFile) {
                const imageResponse = await uploadImage(editTarget.id, form.imageFile);
                imageKey = String(imageResponse.imageKey);
            }

            let updated: Record<string, unknown>;
            try {
                updated = await fetchJson(`/api/tickets/${editTarget.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(buildPayload(form, imageKey)),
                });
            } catch (error) {
                if (form.imageFile && imageKey) {
                    await cleanupImage(editTarget.id, imageKey);
                }
                throw error;
            }

            const nextTicket = mapTicket(updated);
            setTickets((currentTickets) =>
                currentTickets.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket)),
            );
            return;
        }

        const created = await fetchJson("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: form.name,
                venue: form.venue,
                googlePlaceId: form.googlePlaceId,
                detailAddress: form.detailAddress,
                validDate: form.validDate,
                openAt: toIsoDateTime(form.openAt),
                totalCount: Number(form.totalCount),
                allowDuplicate: form.allowDuplicate,
                maxPerUser: Number(form.maxPerUser),
            }),
        });

        let finalTicket = created;
        if (form.imageFile && created.id) {
            const ticketId = String(created.id);
            const imageResponse = await uploadImage(ticketId, form.imageFile);
            try {
                finalTicket = await fetchJson(`/api/tickets/${ticketId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...buildPayload(
                            {
                                ...form,
                                status: "INACTIVE",
                            },
                            String(imageResponse.imageKey),
                        ),
                        status: "INACTIVE",
                    }),
                });
            } catch (error) {
                await cleanupImage(ticketId, String(imageResponse.imageKey));
                throw error;
            }
        }

        const nextTicket = mapTicket(finalTicket);
        setTickets((currentTickets) => [nextTicket, ...currentTickets.filter((ticket) => ticket.id !== nextTicket.id)]);
    };

    useEffect(() => {
        let active = true;

        void fetch("/api/tickets", { cache: "no-store" })
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

                setTickets(items.map(mapTicket));
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

    const filteredTickets = useMemo(() => tickets.filter((ticket) => {
        switch (duplicateFilter) {
            case "ALLOW_DUPLICATE":
                return ticket.allowDuplicate;
            case "NO_DUPLICATE":
                return !ticket.allowDuplicate;
            default:
                return true;
        }
    }), [duplicateFilter, tickets]);

    const emptyStateTitle = (() => {
        switch (duplicateFilter) {
            case "ALLOW_DUPLICATE":
                return t("myTickets.emptyAllowDuplicate");
            case "NO_DUPLICATE":
                return t("myTickets.emptyNoDuplicate");
            default:
                return t("myTickets.empty");
        }
    })();

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
                        <Tabs className="rounded-full border border-primary/30 bg-transparent p-0">
                            <TabsButton active={duplicateFilter === "ALL"} onClick={() => setDuplicateFilter("ALL")}>
                                {t("myTickets.filterAll")}
                            </TabsButton>
                            <TabsButton active={duplicateFilter === "ALLOW_DUPLICATE"} onClick={() => setDuplicateFilter("ALLOW_DUPLICATE")}>
                                {t("myTickets.filterAllowDuplicate")}
                            </TabsButton>
                            <TabsButton active={duplicateFilter === "NO_DUPLICATE"} onClick={() => setDuplicateFilter("NO_DUPLICATE")}>
                                {t("myTickets.filterNoDuplicate")}
                            </TabsButton>
                        </Tabs>
                    </PageFilterBar>
                </PageSection>
            </div>

            <div className="space-y-3 px-5 pb-28 pt-5">
                {hasLoadedTickets && filteredTickets.length === 0 ? (
                    <PageEmptyState
                        title={emptyStateTitle}
                        icon={
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-14 w-14">
                                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                                <polyline points="9 12 11 14 15 10" />
                            </svg>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {filteredTickets.map((ticket) => (
                            <IssuedTicketCard
                                key={ticket.id}
                                ticket={ticket}
                                statusLabel={statusLabel(ticket.status, t)}
                                badgeVariant={statusBadgeStyle(ticket.status)}
                                issuedCountLabel={t("myTickets.issuedCount")}
                                editLabel={t("myTickets.edit")}
                                scanLabel={t("myTickets.scan")}
                                canScan={ticket.status === "ISSUING" || ticket.status === "VERIFYING"}
                                scanHref={`/${locale}/my-tickets/${ticket.id}/scan`}
                                onEdit={() => openEdit(ticket)}
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
