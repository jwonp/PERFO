import { describe, expect, it } from "vitest";
import { isAdminRole, isOrganizerRole } from "./auth-flow.func";

describe("auth-flow.func", () => {
    it("admin role을 대소문자 구분 없이 판별한다", () => {
        expect(isAdminRole("ADMIN")).toBe(true);
        expect(isAdminRole("admin")).toBe(true);
        expect(isAdminRole("USER")).toBe(false);
        expect(isAdminRole(null)).toBe(false);
    });

    it("organizer role을 대소문자 구분 없이 판별한다", () => {
        expect(isOrganizerRole("ORGANIZER")).toBe(true);
        expect(isOrganizerRole("organizer")).toBe(true);
        expect(isOrganizerRole("user")).toBe(false);
        expect(isOrganizerRole(null)).toBe(false);
    });
});
