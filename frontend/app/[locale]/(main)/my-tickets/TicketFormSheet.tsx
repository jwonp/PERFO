"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FormField, FormFieldLabel } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ToggleRow } from "@/components/ui/toggle-row";
import dynamic from "next/dynamic";
import { EMPTY_FORM, ISSUE_STATUS_OPTIONS } from "./my-tickets.constants";
import { isFutureVerifyingRequest, toDateTimeLocalValue } from "./my-tickets.func";
import type { IssueStatus, TicketForm, TicketFormSheetProps } from "./my-tickets.types";

const PlaceAutocompleteInput = dynamic(
    () => import("./PlaceAutocompleteInput").then((m) => ({ default: m.PlaceAutocompleteInput })),
);

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
                      discoveryMode: editTarget.discoveryMode,
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
                            loadingLabel={t("myTickets.placeAutocompleteLoading")}
                            readyLabel={t("myTickets.placeAutocompleteReady")}
                            unavailableLabel={t("myTickets.placeAutocompleteUnavailable")}
                            errorLabel={t("myTickets.placeAutocompleteError")}
                            selectedLabel={t("myTickets.placeAutocompleteSelected")}
                            emptyLabel={t("myTickets.placeAutocompleteEmpty")}
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
                        <p className="text-xs text-[var(--text-muted)]">{t("myTickets.fieldDateHint")}</p>
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
                        <p className="text-xs text-[var(--text-muted)]">{t("myTickets.fieldOpenAtHint")}</p>
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
                                {ISSUE_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {t(option.labelKey)}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    ) : null}

                    {isFutureVerifyingRequest(form.status, form.openAt) ? (
                        <div className="rounded-xl border border-border bg-[color:color-mix(in_srgb,var(--warning)_14%,white)] px-4 py-3 text-sm text-[var(--warning)]">
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

                    <div className="rounded-xl bg-[var(--surface-muted)] px-4">
                        <ToggleRow
                            checked={form.discoveryMode === "LISTED"}
                            label={
                                form.discoveryMode === "LISTED"
                                    ? t("myTickets.discoveryModeListed")
                                    : t("myTickets.discoveryModeLinkOnly")
                            }
                            onToggle={() =>
                                setForm((currentForm) => ({
                                    ...currentForm,
                                    discoveryMode: currentForm.discoveryMode === "LISTED" ? "LINK_ONLY" : "LISTED",
                                }))
                            }
                            labelClassName="cursor-pointer"
                        />
                        <p className="pb-3 text-xs text-[var(--text-muted)]">{t("myTickets.discoveryModeHint")}</p>
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
                        <div className="rounded-xl border border-border bg-[color:color-mix(in_srgb,var(--danger)_14%,white)] px-4 py-3 text-sm text-[var(--danger)]">
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
                            {isSaving ? t("myTickets.saving") : isEdit ? t("myTickets.save") : t("myTickets.create")}
                        </Button>
                    </div>
                </form>
            </BottomSheetContent>
        </BottomSheet>
    );
};

export { TicketFormSheet };
