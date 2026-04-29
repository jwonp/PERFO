"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const formatBadgeCount = (count: number) => (count > 99 ? "99+" : String(count));

const NotificationButton = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const response = await fetch("/api/notifications/unread-count", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    return;
                }

                const body = (await response.json()) as { count?: number };
                if (!cancelled) {
                    setCount(body.count ?? 0);
                }
            } catch {
                // Ignore transient UI fetch failures.
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void load();
            }
        };

        void load();
        window.addEventListener("focus", load);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            cancelled = true;
            window.removeEventListener("focus", load);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, []);

    return (
        <Link
            href="/notifications"
            aria-label="알림 내역"
            className="relative inline-flex size-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-[var(--surface-muted)]"
        >
            <Bell className="size-5" />
            {count > 0 ? (
                <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                    {formatBadgeCount(count)}
                </span>
            ) : null}
        </Link>
    );
};

export { NotificationButton };
