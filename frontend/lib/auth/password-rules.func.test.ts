import { describe, expect, it } from "vitest";
import {
    areAllPasswordRulesValid,
    createPasswordRuleDescriptors,
    doPasswordsMatch,
} from "./password-rules.func";

describe("password-rules.func", () => {
    it("비밀번호 규칙별 충족 여부를 계산한다", () => {
        expect(createPasswordRuleDescriptors("Aa1!")).toEqual([
            { key: "minLength", valid: false },
            { key: "uppercase", valid: true },
            { key: "lowercase", valid: true },
            { key: "number", valid: true },
            { key: "special", valid: true },
        ]);
    });

    it("모든 규칙이 충족된 비밀번호만 true를 반환한다", () => {
        expect(areAllPasswordRulesValid("Valid123!")).toBe(true);
        expect(areAllPasswordRulesValid("invalid")).toBe(false);
    });

    it("비밀번호 일치 여부를 계산한다", () => {
        expect(doPasswordsMatch("Valid123!", "Valid123!")).toBe(true);
        expect(doPasswordsMatch("Valid123!", "Valid123?")).toBe(false);
        expect(doPasswordsMatch("", "")).toBe(false);
    });
});
