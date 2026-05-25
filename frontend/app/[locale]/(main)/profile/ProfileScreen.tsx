"use client";

import { ArrowLeft, Bell, ChevronRight, Headphones, Moon, Pencil, Shield } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { PushNotification } from "@/components/push/PushNotification";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/ui/toggle-row";
import type { MyProfileResponse } from "@/lib/profile/profile.types";

type ProfileScreenProps = {
    t: (key: string, values?: Record<string, number>) => string;
    profile: MyProfileResponse;
    displayName: string;
    userId: string;
    darkMode: boolean;
    sheetOpen: boolean;
    feedbackMessage: string | null;
    onOpenSheet: () => void;
    onCloseSheet: () => void;
    onToggleTheme: () => void;
    onLogout: () => void;
    onSaveProfile: (payload: {
        displayName: string;
        profileImageType: MyProfileResponse["profileImageType"];
        profileImageValue: string;
    }) => Promise<void>;
    onUploadProfileImage: (file: File) => Promise<MyProfileResponse>;
};

export const ProfileScreen = ({
    t,
    profile,
    displayName,
    userId,
    darkMode,
    sheetOpen,
    feedbackMessage,
    onOpenSheet,
    onCloseSheet,
    onToggleTheme,
    onLogout,
    onSaveProfile,
    onUploadProfileImage,
}: ProfileScreenProps) => {
    return (
        <PageShell className="ds-shell">
            <div className="px-5 pt-8 pb-32">
                <PageHeader
                    title={t("title")}
                    leading={<ArrowLeft className="mb-2 h-5 w-5 text-[var(--text)]" />}
                    trailing={<NotificationButton />}
                />

                <PageSection spacing="md" className="pt-8 text-center">
                    <div className="relative mx-auto h-24 w-24">
                        <ProfileAvatar
                            displayName={displayName}
                            profileImageType={profile.profileImageType}
                            profileImageValue={profile.profileImageValue}
                            profileImageUrl={profile.profileImageUrl}
                            size="hero"
                        />
                        <Button
                            size="icon-sm"
                            className="absolute right-0 bottom-0 rounded-full"
                            aria-label={t("editProfile")}
                            onClick={onOpenSheet}
                        >
                            <Pencil className="h-5 w-5" />
                        </Button>
                    </div>

                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text)]">{displayName}</h2>
                    <p className="mt-1.5 text-sm font-medium text-[var(--text-muted)]">ID: {userId}</p>
                    {feedbackMessage && (
                        <p className="mt-4 text-sm font-medium text-primary">{feedbackMessage}</p>
                    )}
                </PageSection>

                <PageSection className="space-y-4">
                    <h3 className="px-2 text-sm font-semibold text-[var(--text-muted)]">{t("appSettings")}</h3>
                    <div className="app-card overflow-hidden">
                        <div className="divide-y divide-border">
                            <ToggleRow
                                checked={darkMode}
                                label={t("darkMode")}
                                icon={<Moon className="h-5 w-5" />}
                                onToggle={onToggleTheme}
                                className="min-h-16 px-5"
                            />

                            <PushNotification>
                                {({
                                    isSupported,
                                    isSubscribed,
                                    isLoading,
                                    error,
                                    subscribe,
                                    unsubscribe,
                                }) => (
                                    <>
                                        <ToggleRow
                                            checked={isSubscribed}
                                            label={t("pushNotification")}
                                            icon={<Bell className="h-5 w-5" />}
                                            onToggle={() => {
                                                if (!isSupported || isLoading) {
                                                    return;
                                                }

                                                void (isSubscribed ? unsubscribe() : subscribe());
                                            }}
                                            className="min-h-16 px-5"
                                        />
                                        {!isSupported && (
                                            <div className="px-5 pb-4 text-sm text-[var(--text-muted)]">
                                                이 브라우저는 푸시 알림을 지원하지 않습니다
                                            </div>
                                        )}
                                        {error && (
                                            <div className="px-5 pb-4 text-sm text-[var(--danger)]">
                                                {error}
                                            </div>
                                        )}
                                    </>
                                )}
                            </PushNotification>
                        </div>
                    </div>
                </PageSection>

                <PageSection className="space-y-4">
                    <h3 className="px-2 text-sm font-semibold text-[var(--text-muted)]">{t("support")}</h3>
                    <div className="app-card overflow-hidden">
                        <button className="flex h-16 w-full items-center justify-between border-b border-border px-5 text-left">
                            <span className="flex items-center gap-4 text-base font-medium text-[var(--text)]">
                                <Headphones className="h-5 w-5 text-[var(--text-subtle)]" />
                                {t("customerSupport")}
                            </span>
                            <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                        </button>

                        <button className="flex h-16 w-full items-center justify-between px-5 text-left">
                            <span className="flex items-center gap-4 text-base font-medium text-[var(--text)]">
                                <Shield className="h-5 w-5 text-[var(--text-subtle)]" />
                                {t("privacyPolicy")}
                            </span>
                            <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                        </button>
                    </div>
                </PageSection>

                <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="mt-8 h-11 w-full text-base font-medium text-[var(--text)] hover:text-[var(--danger)]"
                >
                    {t("logout")}
                </Button>
            </div>

            <ProfileEditSheet
                open={sheetOpen}
                initialDisplayName={profile.displayName}
                initialProfileImageType={profile.profileImageType}
                initialProfileImageValue={profile.profileImageValue}
                initialProfileImageUrl={profile.profileImageUrl}
                title={t("editSheetTitle")}
                displayNameLabel={t("displayNameLabel")}
                displayNamePlaceholder={t("displayNamePlaceholder")}
                displayNameCounterLabel={(current, max) => t("displayNameCounter", { current, max })}
                cancelLabel={t("cancel")}
                saveLabel={t("save")}
                savingLabel={t("saving")}
                minLengthMessage={t("validationDisplayNameMin")}
                maxLengthMessage={t("validationDisplayNameMax")}
                controlCharacterMessage={t("validationDisplayNameControl")}
                uploadTodoLabel={t("imageUploadTodo")}
                uploadImageLabel={t("uploadImageLabel")}
                uploadImageHint={t("uploadImageHint")}
                uploadingImageLabel={t("uploadingImage")}
                onClose={onCloseSheet}
                onSave={onSaveProfile}
                onUpload={onUploadProfileImage}
            />
        </PageShell>
    );
};
