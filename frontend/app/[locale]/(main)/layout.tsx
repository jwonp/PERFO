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
        <div className="flex min-h-dvh bg-perfo-bg">

            {/* 사이드바 — 데스크탑 전용 */}
            <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-56 bg-white border-r border-perfo-secondary/15 z-50">
                <div className="px-6 py-6">
                    <span className="text-xl font-extrabold text-perfo-primary tracking-tight">PERFO</span>
                </div>

                <nav className="flex flex-col gap-1 px-3 flex-1">
                    {tabs.map(({ href, label, Icon, key }) => {
                        const isActive = pathname.includes(`/${key}`);
                        return (
                            <Link
                                key={key}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                                    isActive
                                        ? "bg-perfo-primary/10 text-perfo-primary font-semibold"
                                        : "text-perfo-text/50 hover:bg-perfo-bg hover:text-perfo-text"
                                }`}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="text-sm">{label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 pb-20 lg:pb-0 lg:ml-56 min-h-dvh">
                {children}
            </main>

            {/* 바텀 내비 — 모바일 전용 */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-perfo-secondary/20 z-50">
                <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
                    {tabs.map(({ href, label, Icon, key }) => {
                        const isActive = pathname.includes(`/${key}`);
                        return (
                            <Link
                                key={key}
                                href={href}
                                className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                                    isActive ? "text-perfo-primary" : "text-perfo-secondary"
                                }`}
                            >
                                <Icon className="w-6 h-6" />
                                <span className={`text-[10px] font-semibold tracking-wide uppercase ${
                                    isActive ? "text-perfo-primary" : "text-perfo-secondary"
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
