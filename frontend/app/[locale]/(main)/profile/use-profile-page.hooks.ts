"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getMyProfile, updateProfile, uploadProfileImage } from "@/lib/profile/profile-client";
import type { MyProfileResponse } from "@/lib/profile/profile.types";
import { fallbackProfile } from "./profile-page.func";

export const useProfilePage = () => {
    const t = useTranslations("profile");
    const { data: session, update } = useSession();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [profileOverride, setProfileOverride] = useState<MyProfileResponse | null>(null);
    const { resolvedTheme, setPreference } = useTheme();

    const sessionProfile = useMemo(() => fallbackProfile(session), [session]);

    useEffect(() => {
        if (!session?.user?.id) {
            return;
        }

        let active = true;

        void getMyProfile()
            .then((nextProfile) => {
                if (active) {
                    setProfileOverride(nextProfile);
                }
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, [session?.user?.id]);

    const profile = profileOverride?.id === sessionProfile.id ? profileOverride : sessionProfile;
    const displayName = profile.displayName;
    const userId = (profile.email || session?.user?.email)?.split("@")[0] ?? "perfo_user";
    const darkMode = resolvedTheme === "dark";

    const applyProfileToSession = async (nextProfile: MyProfileResponse) => {
        await update({
            name: nextProfile.displayName,
            image: nextProfile.profileImageUrl,
            profileImageType: nextProfile.profileImageType,
            profileImageValue: nextProfile.profileImageValue,
        });
    };

    const handleSaveProfile = async (payload: Parameters<typeof updateProfile>[0]) => {
        const nextProfile = await updateProfile(payload);
        setProfileOverride(nextProfile);
        setFeedbackMessage(t("saveSuccess"));
        setSheetOpen(false);
        await applyProfileToSession(nextProfile);
    };

    const handleUploadProfileImage = async (file: File) => {
        const nextProfile = await uploadProfileImage(file);
        setProfileOverride(nextProfile);
        setFeedbackMessage(t("uploadSuccess"));
        await applyProfileToSession(nextProfile);
        return nextProfile;
    };

    return {
        t,
        profile,
        displayName,
        userId,
        darkMode,
        sheetOpen,
        feedbackMessage,
        setSheetOpen,
        setPreference,
        handleSaveProfile,
        handleUploadProfileImage,
        handleLogout: () => signOut({ callbackUrl: "/login" }),
    };
};
