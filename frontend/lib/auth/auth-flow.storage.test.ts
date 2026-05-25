import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    clearSignUpDraft,
    getSignUpDraft,
    hasSignUpDraft,
    saveSignUpDraft,
} from "./auth-flow.storage";

describe("auth-flow.storage", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    afterEach(() => {
        window.sessionStorage.clear();
    });

    it("signup draft를 저장하고 조회한다", () => {
        saveSignUpDraft({
            email: "new@example.com",
            name: "홍길동",
            password: "Valid123!",
        });

        expect(getSignUpDraft()).toEqual({
            email: "new@example.com",
            name: "홍길동",
            password: "Valid123!",
        });
        expect(hasSignUpDraft()).toBe(true);
    });

    it("signup draft를 삭제한다", () => {
        saveSignUpDraft({
            email: "new@example.com",
            name: "홍길동",
            password: "Valid123!",
        });

        clearSignUpDraft();

        expect(getSignUpDraft()).toBeNull();
        expect(hasSignUpDraft()).toBe(false);
    });

    it("형식이 잘못된 draft는 null로 처리한다", () => {
        window.sessionStorage.setItem("perfo.signup-draft", JSON.stringify({ email: "new@example.com" }));

        expect(getSignUpDraft()).toBeNull();
        expect(hasSignUpDraft()).toBe(false);
    });
});
