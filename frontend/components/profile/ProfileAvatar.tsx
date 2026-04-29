"use client";

import { UserRound } from "lucide-react";
import { PROFILE_IMAGE_PRESETS } from "@/lib/profile/profile-presets";
import type { ProfileImagePresetKey } from "@/lib/profile/profile-presets";
import type { ProfileImageType } from "@/lib/profile/profile.types";
import { cn } from "@/lib/lib/utils";

interface ProfileAvatarProps {
    displayName: string;
    profileImageType: ProfileImageType;
    profileImageValue: string | null;
    profileImageUrl?: string | null;
    size?: "lg" | "md" | "sm";
    className?: string;
}

const sizeMap = {
    lg: "h-32 w-32",
    md: "h-16 w-16",
    sm: "h-12 w-12",
} as const;

const iconSizeMap = {
    lg: "h-16 w-16",
    md: "h-8 w-8",
    sm: "h-6 w-6",
} as const;

export const ProfileAvatar = ({
    displayName,
    profileImageType,
    profileImageValue,
    profileImageUrl,
    size = "lg",
    className,
}: ProfileAvatarProps) => {
    const resolvedImageUrl = profileImageUrl ?? profileImageValue;

    if ((profileImageType === "PROVIDER" || profileImageType === "UPLOADED") && resolvedImageUrl) {
        return (
            <div className={cn("flex items-center justify-center overflow-hidden rounded-full border-8 border-[var(--surface-raised)] bg-[var(--surface-muted)] shadow-sm", sizeMap[size], className)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolvedImageUrl} alt={displayName} className="h-full w-full object-cover" />
            </div>
        );
    }

    const presetKey = (profileImageType === "PRESET" && profileImageValue
        ? profileImageValue
        : "avatar-blue") as ProfileImagePresetKey;
    const preset = PROFILE_IMAGE_PRESETS[presetKey];

    return (
        <div className={cn("flex items-center justify-center overflow-hidden rounded-full border-8 border-[var(--surface-raised)] shadow-sm", sizeMap[size], preset.bg, className)}>
            <UserRound className={cn(iconSizeMap[size], preset.fg)} />
        </div>
    );
};
