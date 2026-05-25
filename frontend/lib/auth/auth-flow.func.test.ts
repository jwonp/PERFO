import { describe, expect, it } from "vitest";
import { isOrganizerRole } from "./auth-flow.func";

describe("auth-flow.func", () => {
    it("organizer role을 대소문자 구분 없이 판별한다", () => {
        expect(isOrganizerRole("ORGANIZER")).toBe(true);
        expect(isOrganizerRole("organizer")).toBe(true);
        expect(isOrganizerRole("user")).toBe(false);
        expect(isOrganizerRole(null)).toBe(false);
    });
});
