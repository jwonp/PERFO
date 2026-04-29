export const PROFILE_IMAGE_PRESET_KEYS = [
    "avatar-blue",
    "avatar-green",
    "avatar-coral",
    "avatar-violet",
    "avatar-slate",
    "avatar-gold",
] as const;

export type ProfileImagePresetKey = (typeof PROFILE_IMAGE_PRESET_KEYS)[number];

export const PROFILE_IMAGE_PRESETS: Record<ProfileImagePresetKey, { bg: string; fg: string; ring: string }> = {
    "avatar-blue": {
        bg: "bg-[linear-gradient(135deg,#d8efff_0%,#6db8ff_100%)]",
        fg: "text-[#0f4f8a]",
        ring: "ring-[#6db8ff]/50",
    },
    "avatar-green": {
        bg: "bg-[linear-gradient(135deg,#dff7df_0%,#66c98d_100%)]",
        fg: "text-[#16603d]",
        ring: "ring-[#66c98d]/45",
    },
    "avatar-coral": {
        bg: "bg-[linear-gradient(135deg,#ffe2d8_0%,#ff8a6c_100%)]",
        fg: "text-[#8a341e]",
        ring: "ring-[#ff8a6c]/45",
    },
    "avatar-violet": {
        bg: "bg-[linear-gradient(135deg,#efe4ff_0%,#a779ff_100%)]",
        fg: "text-[#5d2ea9]",
        ring: "ring-[#a779ff]/45",
    },
    "avatar-slate": {
        bg: "bg-[linear-gradient(135deg,#e8eef7_0%,#8c9db7_100%)]",
        fg: "text-[#334155]",
        ring: "ring-[#8c9db7]/45",
    },
    "avatar-gold": {
        bg: "bg-[linear-gradient(135deg,#fff1c9_0%,#f2c14e_100%)]",
        fg: "text-[#7a4d00]",
        ring: "ring-[#f2c14e]/45",
    },
};
