import { SIGNUP_DRAFT_STORAGE_KEY } from "./auth-flow.constants";
import type { SignUpDraft } from "./auth-flow.types";

const hasSessionStorage = () => (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
);

const isSignUpDraft = (value: unknown): value is SignUpDraft => {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.email === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.password === "string"
    );
};

export const saveSignUpDraft = (draft: SignUpDraft) => {
    if (!hasSessionStorage()) {
        return;
    }

    window.sessionStorage.setItem(
        SIGNUP_DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
    );
};

export const getSignUpDraft = (): SignUpDraft | null => {
    if (!hasSessionStorage()) {
        return null;
    }

    const raw = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        return isSignUpDraft(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const hasSignUpDraft = () => getSignUpDraft() !== null;

export const clearSignUpDraft = () => {
    if (!hasSessionStorage()) {
        return;
    }

    window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
};
