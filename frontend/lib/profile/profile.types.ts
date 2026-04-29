export type ProfileImageType = "NONE" | "PRESET" | "PROVIDER" | "UPLOADED";

export interface MyProfileResponse {
    id: number;
    email: string;
    displayName: string;
    profileImageType: ProfileImageType;
    profileImageValue: string | null;
    profileImageUrl: string | null;
    updatedAt: string | null;
}

export interface UpdateMyProfileRequest {
    displayName: string;
    profileImageType: ProfileImageType;
    profileImageValue: string | null;
}
