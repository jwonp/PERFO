"use client";

import { Check, UserRound } from "lucide-react";
import { PROFILE_IMAGE_PRESETS, PROFILE_IMAGE_PRESET_KEYS } from "@/lib/profile/profile-presets";
import type { ProfileImagePresetKey } from "@/lib/profile/profile-presets";
import { cn } from "@/lib/lib/utils";

interface ProfileAvatarPickerProps {
    value: ProfileImagePresetKey;
    onChange: (value: ProfileImagePresetKey) => void;
    label: string;
}

export const ProfileAvatarPicker = ({ value, onChange, label }: ProfileAvatarPickerProps) => {
    return (
        <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-[var(--text)]">{label}</legend>
            <div className="grid grid-cols-3 gap-3">
                {PROFILE_IMAGE_PRESET_KEYS.map((presetKey) => {
                    const preset = PROFILE_IMAGE_PRESETS[presetKey];
                    const selected = value === presetKey;

                    return (
                        <label
                            key={presetKey}
                            className={cn(
                                "relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition-colors",
                                selected
                                    ? "border-primary bg-[var(--surface-muted)] shadow-[var(--shadow-panel)]"
                                    : "border-border bg-[var(--surface-raised)] hover:bg-[var(--surface-muted)]",
                            )}
                        >
                            <input
                                type="radio"
                                name="profile-avatar-preset"
                                value={presetKey}
                                checked={selected}
                                onChange={() => onChange(presetKey)}
                                className="sr-only"
                                aria-label={presetKey}
                            />
                            <div className={cn("flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--surface-raised)]", preset.bg, selected ? preset.ring : "ring-transparent")}>
                                <UserRound className={cn("h-7 w-7", preset.fg)} />
                            </div>
                            <span className="text-xs font-bold capitalize text-[var(--text-subtle)]">{presetKey.replace("avatar-", "")}</span>
                            {selected && (
                                <span className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground">
                                    <Check className="h-3 w-3" />
                                </span>
                            )}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
};
