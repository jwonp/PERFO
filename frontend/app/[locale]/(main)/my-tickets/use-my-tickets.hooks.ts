"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotificationSnapshotBootstrap } from "@/components/notifications/use-notification-snapshot-bootstrap";
import {
    cleanupTicketImage,
    createIssuedTicket,
    fetchIssuedTickets,
    updateIssuedTicket,
    uploadTicketImage,
} from "./my-tickets.api";
import {
    buildNotificationSnapshotTickets,
    buildPublicBookingUrl,
    emptyStateTitleKey,
    filterTicketsByDuplicatePurchase,
    mapTicket,
} from "./my-tickets.func";
import type { DuplicatePurchaseFilter, IssuedTicket, MyTicketsControllerArgs, MyTicketsControllerResult, TicketForm } from "./my-tickets.types";

export const useMyTicketsController = ({
    locale,
    t,
}: MyTicketsControllerArgs): MyTicketsControllerResult => {
    const [tickets, setTickets] = useState<IssuedTicket[]>([]);
    const [hasLoadedTickets, setHasLoadedTickets] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<IssuedTicket | null>(null);
    const [duplicateFilter, setDuplicateFilterState] = useState<DuplicatePurchaseFilter>("ALL");
    const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

    const openCreate = () => {
        setEditTarget(null);
        setSheetOpen(true);
    };

    const openEdit = (ticket: IssuedTicket) => {
        setEditTarget(ticket);
        setSheetOpen(true);
    };

    const handleClose = () => setSheetOpen(false);

    const handleSubmit = async (form: TicketForm) => {
        if (editTarget) {
            let imageKey = form.imageKey ?? null;

            if (form.imageFile) {
                const imageResponse = await uploadTicketImage(editTarget.id, form.imageFile, t("myTickets.saveFailed"));
                imageKey = String(imageResponse.imageKey);
            }

            let updated: Record<string, unknown>;
            try {
                updated = await updateIssuedTicket(editTarget.id, form, imageKey, t("myTickets.saveFailed"));
            } catch (error) {
                if (form.imageFile && imageKey) {
                    await cleanupTicketImage(editTarget.id, imageKey);
                }
                throw error;
            }

            const nextTicket = mapTicket(updated);
            setTickets((currentTickets) =>
                currentTickets.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket)),
            );
            return;
        }

        const created = await createIssuedTicket(form, t("myTickets.saveFailed"));
        const nextTicket = mapTicket(created);
        setTickets((currentTickets) => [nextTicket, ...currentTickets.filter((ticket) => ticket.id !== nextTicket.id)]);
    };

    const handleCopyBookingUrl = async (ticket: IssuedTicket) => {
        const publicUrl = buildPublicBookingUrl(
            ticket,
            locale,
            typeof window === "undefined" ? null : window.location.origin,
        );
        if (!publicUrl || !navigator.clipboard?.writeText) {
            return;
        }

        await navigator.clipboard.writeText(publicUrl);
        setCopiedTicketId(ticket.id);
    };

    const handleShareBookingUrl = async (ticket: IssuedTicket) => {
        const publicUrl = buildPublicBookingUrl(
            ticket,
            locale,
            typeof window === "undefined" ? null : window.location.origin,
        );
        if (!publicUrl || !navigator.share) {
            return;
        }

        await navigator.share({
            title: ticket.name,
            text: ticket.name,
            url: publicUrl,
        });
    };

    useEffect(() => {
        let active = true;

        void fetchIssuedTickets()
            .then((items) => {
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

    useEffect(() => {
        const firstImageUrl = tickets[0]?.imageUrl;
        if (!firstImageUrl) {
            return;
        }

        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = firstImageUrl;
        link.fetchPriority = "high";
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, [tickets]);

    useNotificationSnapshotBootstrap(buildNotificationSnapshotTickets(tickets, locale));

    const filteredTickets = useMemo(
        () => filterTicketsByDuplicatePurchase(tickets, duplicateFilter),
        [duplicateFilter, tickets],
    );

    const emptyStateTitle = t(emptyStateTitleKey(duplicateFilter));
    const canShareBookingUrl = typeof navigator !== "undefined" && typeof navigator.share === "function";

    return {
        filteredTickets,
        hasLoadedTickets,
        sheetOpen,
        editTarget,
        duplicateFilter,
        copiedTicketId,
        canShareBookingUrl,
        emptyStateTitle,
        openCreate,
        openEdit,
        handleClose,
        setDuplicateFilter: setDuplicateFilterState,
        handleSubmit,
        handleCopyBookingUrl,
        handleShareBookingUrl,
    };
};
