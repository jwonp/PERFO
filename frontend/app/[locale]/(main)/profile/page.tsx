"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Bell, Headphones, Moon, Pencil, Shield, UserRound } from "lucide-react";
import { PushNotification } from "@/components/push/PushNotification";
import { ActionRow, ActionRowChevron, ActionRowLeading, ActionRowText } from "@/components/ui/action-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatLabel, StatMeta, StatValue } from "@/components/ui/stat-card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeader, ToolbarTitle } from "@/components/ui/toolbar";

const ProfilePage = () => {
    const t = useTranslations("profile");
    const { data: session } = useSession();
    const [darkMode, setDarkMode] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);

    const displayName = session?.user?.name ?? "PERFO User";
    const userId = session?.user?.email?.split("@")[0] ?? "perfo_user";

    return (
        <div className="min-h-full ds-shell">
            <div className="space-y-4 px-5 pt-6 pb-28 lg:pb-6">
                <Toolbar className="sticky top-4 z-10">
                    <ToolbarHeader>
                        <div className="space-y-2">
                            <p className="ds-eyebrow">Account</p>
                            <ToolbarTitle>{t("title")}</ToolbarTitle>
                            <ToolbarDescription>{displayName} · ID: {userId}</ToolbarDescription>
                        </div>
                        <ToolbarActions>
                            <Badge variant="info">Active Session</Badge>
                        </ToolbarActions>
                    </ToolbarHeader>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <StatCard>
                            <StatLabel>{t("appSettings")}</StatLabel>
                            <StatValue>{darkMode ? "Dark" : "Light"}</StatValue>
                            <StatMeta>{t("darkMode")}</StatMeta>
                        </StatCard>
                        <StatCard>
                            <StatLabel>{t("pushNotification")}</StatLabel>
                            <StatValue>{pushEnabled ? "On" : "Off"}</StatValue>
                            <StatMeta>{t("support")}</StatMeta>
                        </StatCard>
                        <StatCard>
                            <StatLabel>{t("support")}</StatLabel>
                            <StatValue>2 links</StatValue>
                            <StatMeta>{t("customerSupport")}</StatMeta>
                        </StatCard>
                    </div>
                </Toolbar>

                <Card className="border-border/80 bg-[var(--surface-raised)]">
                    <CardContent className="flex flex-col items-center gap-4 px-6 py-6 text-center sm:flex-row sm:text-left">
                        <div className="relative">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-perfo-secondary/20">
                            {session?.user?.image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={session.user.image} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <UserRound className="h-12 w-12 text-perfo-secondary" />
                            )}
                            </div>
                            <Button size="icon-xs" className="absolute right-0 bottom-0 rounded-full" aria-label="Edit profile">
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center justify-center gap-2 sm:justify-start">
                                <h2 className="text-lg font-semibold text-[var(--text)]">{displayName}</h2>
                                <Badge variant="neutral">Member</Badge>
                            </div>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">ID: {userId}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/80 bg-[var(--surface-raised)]">
                    <CardHeader className="px-6 pb-0">
                        <CardTitle className="text-base">{t("appSettings")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6">
                        <div className="divide-y divide-border">
                            <ToggleRow
                                checked={darkMode}
                                label={t("darkMode")}
                                icon={<Moon className="h-5 w-5" />}
                                onToggle={() => setDarkMode((v) => !v)}
                            />

                            <ToggleRow
                                checked={pushEnabled}
                                label={t("pushNotification")}
                                icon={<Bell className="h-5 w-5" />}
                                onToggle={() => setPushEnabled((v) => !v)}
                            />

                        {pushEnabled && (
                            <div className="rounded-lg bg-[var(--surface-muted)] px-4 py-3">
                                <PushNotification />
                            </div>
                        )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/80 bg-[var(--surface-raised)]">
                    <CardHeader className="px-6 pb-0">
                        <CardTitle className="text-base">{t("support")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6">
                        <div className="divide-y divide-border">
                            <ActionRow>
                                <ActionRowLeading>
                                    <Headphones className="h-5 w-5" />
                                    <ActionRowText>{t("customerSupport")}</ActionRowText>
                                </ActionRowLeading>
                                <ActionRowChevron />
                            </ActionRow>

                            <ActionRow>
                                <ActionRowLeading>
                                    <Shield className="h-5 w-5" />
                                    <ActionRowText>{t("privacyPolicy")}</ActionRowText>
                                </ActionRowLeading>
                                <ActionRowChevron />
                            </ActionRow>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    variant="outline"
                    className="h-11 w-full text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                    {t("logout")}
                </Button>
            </div>
        </div>
    );
};

export default ProfilePage;
