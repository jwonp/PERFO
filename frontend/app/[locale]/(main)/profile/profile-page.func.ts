import type { Session } from "next-auth";
import type { MyProfileResponse } from "@/lib/profile/profile.types";

export const fallbackProfile = (session: Session | null): MyProfileResponse => ({
    id: Number(session?.user?.id ?? 0),
    email: session?.user?.email ?? "",
    displayName: session?.user?.name ?? "PERFO User",
    profileImageType: (session?.user?.profileImageType as MyProfileResponse["profileImageType"] | undefined)
        ?? (session?.user?.image ? "PROVIDER" : "PRESET"),
    profileImageValue: session?.user?.profileImageValue ?? session?.user?.image ?? "avatar-blue",
    profileImageUrl: session?.user?.image ?? null,
    updatedAt: null,
});
