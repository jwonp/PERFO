"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { LOCALE_LABELS } from "@/components/locale-switcher.constants";

const LocaleSwitcher = () => {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLocaleChange = (newLocale: string) => {
        setOpen(false);
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)]"
            >
                <Globe className="h-4 w-4 text-[var(--text-subtle)]" />
                {LOCALE_LABELS[locale]}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-border bg-[var(--surface-raised)] shadow-[var(--shadow-soft)]">
                    {routing.locales.map((l) => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => handleLocaleChange(l)}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-muted)] ${l === locale
                                    ? "bg-primary/8 font-semibold text-primary"
                                    : "text-[var(--text)]"
                                }`}
                        >
                            {LOCALE_LABELS[l]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocaleSwitcher;
