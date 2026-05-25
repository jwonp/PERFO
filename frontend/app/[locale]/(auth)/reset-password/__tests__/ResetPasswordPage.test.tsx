import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "../page";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
    useSearchParams: () => searchParams,
}));

vi.mock("next-intl", () => ({
    useTranslations: () => (key: string, values?: Record<string, string>) => {
        const messages: Record<string, string> = {
            "common.back": "뒤로",
            "common.confirmPassword": "비밀번호 확인",
            "common.newPassword": "새 비밀번호",
            "common.newPasswordPlaceholder": "새 비밀번호를 입력하세요",
            "common.confirmNewPasswordPlaceholder": "새 비밀번호를 다시 입력하세요",
            "passwordRules.minLength": "8자 이상",
            "passwordRules.uppercase": "대문자 포함",
            "passwordRules.lowercase": "소문자 포함",
            "passwordRules.number": "숫자 포함",
            "passwordRules.special": "특수 문자 포함",
            "passwordRules.match": "비밀번호 일치",
            "resetPassword.title": "비밀번호 재설정",
            "resetPassword.subtitle": `${values?.email ?? ""} 계정의 새 비밀번호를 설정하세요`,
            "resetPassword.failed": "비밀번호를 재설정하지 못했습니다.",
            "resetPassword.resetButton": "비밀번호 재설정",
            "resetPassword.resetting": "재설정 중...",
        };
        return messages[key] ?? key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
    useRouter: () => ({ push }),
    Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
        <a href={typeof href === "string" ? href : String(href)} {...props}>
            {children}
        </a>
    ),
}));

describe("ResetPasswordPage", () => {
    beforeEach(() => {
        searchParams = new URLSearchParams("email=new%40example.com&token=verify-token");
        push.mockReset();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })),
        );
    });

    it("비밀번호 규칙과 일치가 충족되어야 재설정 버튼이 활성화된다", async () => {
        const user = userEvent.setup();
        render(<ResetPasswordPage />);

        const submitButton = screen.getByRole("button", { name: "비밀번호 재설정" });
        expect(submitButton).toBeDisabled();

        await user.type(screen.getByLabelText("새 비밀번호"), "Valid123!");
        await user.type(screen.getByLabelText("비밀번호 확인"), "Valid123!");

        expect(submitButton).toBeEnabled();
    });

    it("재설정 성공 시 complete 화면으로 이동한다", async () => {
        const user = userEvent.setup();
        render(<ResetPasswordPage />);

        await user.type(screen.getByLabelText("새 비밀번호"), "Valid123!");
        await user.type(screen.getByLabelText("비밀번호 확인"), "Valid123!");
        await user.click(screen.getByRole("button", { name: "비밀번호 재설정" }));

        expect(fetch).toHaveBeenCalledWith(
            "/api/auth/password-reset",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    email: "new@example.com",
                    password: "Valid123!",
                    verificationToken: "verify-token",
                }),
            }),
        );
        expect(push).toHaveBeenCalledWith("/reset-password/complete?email=new%40example.com");
    });
});
