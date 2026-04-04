"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { PushNotification } from "@/components/push/PushNotification";

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function HeadphonesIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

function PencilIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
                checked ? "bg-perfo-primary" : "bg-perfo-secondary/30"
            }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

export default function ProfilePage() {
    const t = useTranslations("profile");
    const { data: session } = useSession();
    const [darkMode, setDarkMode] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    const displayName = session?.user?.name ?? "PERFO User";
    const userId = session?.user?.email?.split("@")[0] ?? "perfo_user";

    return (
        <div className="min-h-full bg-perfo-bg">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-5 py-4 border-b border-perfo-secondary/10">
                <h1 className="text-lg font-bold text-perfo-primary text-center">{t("title")}</h1>
            </div>

            <div className="px-5 py-6 space-y-5">
                {/* Profile section */}
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-perfo-secondary/20 flex items-center justify-center overflow-hidden">
                            {session?.user?.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={session.user.image} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 text-perfo-secondary">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                </svg>
                            )}
                        </div>
                        {/* Edit button */}
                        <button className="absolute bottom-0 right-0 w-7 h-7 bg-perfo-primary rounded-full flex items-center justify-center text-white shadow-md hover:bg-perfo-primary-hover transition-colors">
                            <PencilIcon />
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="font-bold text-perfo-text text-base">{displayName}</p>
                        <p className="text-perfo-text/50 text-sm">ID: {userId}</p>
                    </div>
                </div>

                {/* APP SETTINGS */}
                <div>
                    <p className="text-xs font-semibold text-perfo-secondary/80 uppercase tracking-widest mb-2 px-1">
                        {t("appSettings")}
                    </p>
                    <div className="bg-white rounded-2xl divide-y divide-perfo-secondary/10 shadow-sm">
                        {/* Dark mode */}
                        <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3 text-perfo-text/70">
                                <MoonIcon />
                                <span className="text-sm font-medium text-perfo-text">{t("darkMode")}</span>
                            </div>
                            <Toggle checked={darkMode} onToggle={() => setDarkMode((v) => !v)} />
                        </div>

                        {/* Push notification */}
                        <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3 text-perfo-text/70">
                                <BellIcon />
                                <span className="text-sm font-medium text-perfo-text">{t("pushNotification")}</span>
                            </div>
                            <Toggle checked={pushEnabled} onToggle={() => setPushEnabled((v) => !v)} />
                        </div>

                        {/* Push subscription component (hidden, synced with toggle) */}
                        {pushEnabled && (
                            <div className="px-4 py-3 bg-perfo-bg/50">
                                <PushNotification />
                            </div>
                        )}
                    </div>
                </div>

                {/* SUPPORT */}
                <div>
                    <p className="text-xs font-semibold text-perfo-secondary/80 uppercase tracking-widest mb-2 px-1">
                        {t("support")}
                    </p>
                    <div className="bg-white rounded-2xl divide-y divide-perfo-secondary/10 shadow-sm">
                        {/* Customer support */}
                        <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-perfo-bg/50 transition-colors rounded-t-2xl">
                            <div className="flex items-center gap-3 text-perfo-text/70">
                                <HeadphonesIcon />
                                <span className="text-sm font-medium text-perfo-text">{t("customerSupport")}</span>
                            </div>
                            <ChevronRightIcon />
                        </button>

                        {/* Privacy policy */}
                        <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-perfo-bg/50 transition-colors rounded-b-2xl">
                            <div className="flex items-center gap-3 text-perfo-text/70">
                                <ShieldIcon />
                                <span className="text-sm font-medium text-perfo-text">{t("privacyPolicy")}</span>
                            </div>
                            <ChevronRightIcon />
                        </button>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-center text-perfo-text/60 text-sm font-medium py-3 hover:text-red-500 transition-colors"
                >
                    {t("logout")}
                </button>
            </div>
        </div>
    );
}
