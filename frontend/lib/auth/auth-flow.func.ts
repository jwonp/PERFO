import { ORGANIZER_ROLE } from "./auth-flow.constants";

export const isOrganizerRole = (role?: string | null): boolean => {
    return role?.toUpperCase() === ORGANIZER_ROLE;
};
