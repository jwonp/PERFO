"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import type { IconProps, MainLayoutProps } from "./layout.types";

const TicketIcon = ({ className }: IconProps) => {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
        </svg>
    );
};

const MyTicketsIcon = ({ className }: IconProps) => {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    );
};

const ProfileIcon = ({ className }: IconProps) => {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
    );
};

const MainLayout = ({ children }: MainLayoutProps) => {
    const t = useTranslations("nav");
    const pathname = usePathname();

    const tabs = [
        { href: "/reserved", label: t("reserved"), Icon: TicketIcon, key: "reserved" },
        { href: "/my-tickets", label: t("myTickets"), Icon: MyTicketsIcon, key: "my-tickets" },
        { href: "/profile", label: t("profile"), Icon: ProfileIcon, key: "profile" },
    ];

    return (
        <div className="min-h-dvh bg-background text-foreground">
            <main className="app-screen min-h-dvh pb-20">
                {children}
            </main>

            <nav className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-[var(--surface-raised)]">
                <div className="app-screen flex h-20 items-center justify-around px-4">
                    {tabs.map(({ href, label, Icon, key }) => {
                        const isActive = pathname.includes(`/${key}`);
                        return (
                            <Link
                                key={key}
                                href={href}
                                className={`flex min-w-20 flex-col items-center gap-1 px-2 py-2 transition-colors ${
                                    isActive ? "text-primary" : "text-[var(--text-muted)]"
                                }`}
                            >
                                <Icon className="h-6 w-6" />
                                <span className={`text-[10px] font-semibold tracking-wide uppercase ${
                                    isActive ? "text-primary" : "text-[var(--text-muted)]"
                                }`}>
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default MainLayout;
