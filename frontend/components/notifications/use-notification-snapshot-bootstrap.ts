"use client";

import { useEffect, useRef } from "react";
import type { NotificationSyncTicket } from "@/lib/notifications/notification.types";

const useNotificationSnapshotBootstrap = (tickets: NotificationSyncTicket[]) => {
    const lastPayloadRef = useRef("");

    useEffect(() => {
        if (tickets.length === 0) {
            return;
        }

        const payload = JSON.stringify({ tickets });
        if (lastPayloadRef.current === payload) {
            return;
        }

        lastPayloadRef.current = payload;

        void fetch("/api/notifications/bootstrap", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: payload,
        }).catch(() => {
            // Bootstrap should not block the screen.
        });
    }, [tickets]);
};

export { useNotificationSnapshotBootstrap };
