import type { MyProfileResponse, UpdateMyProfileRequest } from "@/lib/profile/profile.types";

const parseJson = async <T>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message = data && typeof data === "object" && "message" in data ? String(data.message) : "Request failed";
        throw new Error(message);
    }

    return data as T;
};

export const getMyProfile = async (): Promise<MyProfileResponse> => {
    const response = await fetch("/api/users/me", { method: "GET", cache: "no-store" });
    return parseJson<MyProfileResponse>(response);
};

export const updateProfile = async (payload: UpdateMyProfileRequest): Promise<MyProfileResponse> => {
    const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return parseJson<MyProfileResponse>(response);
};

export const uploadProfileImage = async (file: File): Promise<MyProfileResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/users/me/profile-image", {
        method: "POST",
        body: formData,
    });

    return parseJson<MyProfileResponse>(response);
};
