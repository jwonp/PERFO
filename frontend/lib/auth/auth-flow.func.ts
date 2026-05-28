import { ADMIN_ROLE, ORGANIZER_ROLE } from "./auth-flow.constants";

export const isAdminRole = (role?: string | null): boolean => {
    return role?.toUpperCase() === ADMIN_ROLE;
};

export const isOrganizerRole = (role?: string | null): boolean => {
    return role?.toUpperCase() === ORGANIZER_ROLE;
};
