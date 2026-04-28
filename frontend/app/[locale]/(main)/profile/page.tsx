"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { ArrowLeft, Bell, ChevronRight, Headphones, Moon, Pencil, Shield, UserRound } from "lucide-react";
import { PushNotification } from "@/components/push/PushNotification";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/ui/toggle-row";

const ProfilePage = () => {
    const t = useTranslations("profile");
    const { data: session } = useSession();
    const [darkMode, setDarkMode] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    const displayName = session?.user?.name ?? "PERFO User";
    const userId = session?.user?.email?.split("@")[0] ?? "perfo_user";

    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-6 px-5 pt-8 pb-40">
                <header className="flex items-center gap-8">
                    <ArrowLeft className="h-8 w-8 text-[var(--text)]" />
                    <h1 className="text-4xl font-extrabold leading-none text-perfo-primary">{t("title")}</h1>
                </header>

                <section className="pt-12 text-center">
                    <div className="relative mx-auto h-32 w-32">
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-8 border-white bg-[#ffc39f] shadow-sm">
                            {session?.user?.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={session.user.image} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <UserRound className="h-16 w-16 text-[#5a9a9a]" />
                            )}
                        </div>
                        <Button size="icon-sm" className="absolute right-0 bottom-1 rounded-full" aria-label="Edit profile">
                            <Pencil className="h-5 w-5" />
                        </Button>
                    </div>

                    <h2 className="mt-6 text-3xl font-extrabold text-[var(--text)]">{displayName}</h2>
                    <p className="mt-3 text-2xl font-medium text-[#9bafd9]">ID: {userId}</p>
                </section>

                <section className="space-y-4">
                    <h3 className="px-2 text-xl font-extrabold uppercase tracking-wide text-[#9bafd9]">{t("appSettings")}</h3>
                    <div className="app-card overflow-hidden">
                        <div className="divide-y divide-border">
                            <ToggleRow
                                checked={darkMode}
                                label={t("darkMode")}
                                icon={<Moon className="h-5 w-5" />}
                                onToggle={() => setDarkMode((v) => !v)}
                                className="min-h-16 px-5"
                                labelClassName="text-xl font-bold"
                            />

                            <ToggleRow
                                checked={pushEnabled}
                                label={t("pushNotification")}
                                icon={<Bell className="h-5 w-5" />}
                                onToggle={() => setPushEnabled((v) => !v)}
                                className="min-h-16 px-5"
                                labelClassName="text-xl font-bold"
                            />

                        {pushEnabled && (
                            <div className="rounded-lg bg-[var(--surface-muted)] px-4 py-3">
                                <PushNotification />
                            </div>
                        )}
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="px-2 text-xl font-extrabold uppercase tracking-wide text-[#9bafd9]">{t("support")}</h3>
                    <div className="app-card overflow-hidden">
                        <button className="flex h-16 w-full items-center justify-between border-b border-border px-5 text-left">
                            <span className="flex items-center gap-5 text-xl font-bold text-[var(--text)]">
                                <Headphones className="h-7 w-7 text-[#9bafd9]" />
                                {t("customerSupport")}
                            </span>
                            <ChevronRight className="h-8 w-8 text-[var(--text)]" />
                        </button>

                        <button className="flex h-16 w-full items-center justify-between px-5 text-left">
                            <span className="flex items-center gap-5 text-xl font-bold text-[var(--text)]">
                                <Shield className="h-7 w-7 text-[#9bafd9]" />
                                {t("privacyPolicy")}
                            </span>
                            <ChevronRight className="h-8 w-8 text-[var(--text)]" />
                        </button>
                    </div>
                </section>

                <Button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    variant="ghost"
                    className="mt-10 h-12 w-full text-3xl font-medium text-[var(--text)] hover:text-[var(--danger)]"
                >
                    {t("logout")}
                </Button>
            </div>
        </div>
    );
};

export default ProfilePage;
