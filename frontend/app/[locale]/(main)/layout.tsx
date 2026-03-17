"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";

function TicketIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
        </svg>
    );
}

function MyTicketsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
            <polyline points="9 12 11 14 15 10" />
        </svg>
    );
}

function ProfileIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("nav");
    const pathname = usePathname();

    const tabs = [
        { href: "/reserved", label: t("reserved"), Icon: TicketIcon, key: "reserved" },
        { href: "/my-tickets", label: t("myTickets"), Icon: MyTicketsIcon, key: "my-tickets" },
        { href: "/profile", label: t("profile"), Icon: ProfileIcon, key: "profile" },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-perfo-bg">
            <main className="flex-1 pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-perfo-secondary/20 z-50">
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
}
