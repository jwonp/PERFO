"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const localeLabels: Record<string, string> = {
    en: "English",
    ja: "日本語",
    ko: "한국어",
};

export default function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleLocaleChange(newLocale: string) {
        setOpen(false);
        router.replace(pathname, { locale: newLocale });
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-perfo-secondary/30 bg-white px-3 py-1.5 text-sm font-medium text-perfo-text hover:bg-perfo-bg transition-colors"
            >
                <Globe className="w-4 h-4 text-perfo-secondary" />
                {localeLabels[locale]}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-perfo-secondary/20 bg-white shadow-lg overflow-hidden">
                    {routing.locales.map((l) => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => handleLocaleChange(l)}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-perfo-bg ${l === locale
                                    ? "text-perfo-primary font-semibold bg-perfo-primary/5"
                                    : "text-perfo-text"
                                }`}
                        >
                            {localeLabels[l]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
