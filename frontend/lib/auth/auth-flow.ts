export const SIGNUP_DRAFT_STORAGE_KEY = "perfo.signup-draft";
export const ORGANIZER_ROLE = "ORGANIZER";

export type SignUpDraft = {
    email: string;
    name: string;
    password: string;
};

export const isOrganizerRole = (role?: string | null): boolean => {
    return role?.toUpperCase() === ORGANIZER_ROLE;
};
