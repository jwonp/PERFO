"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PasswordRule } from "@/components/auth/password-rules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SignUpPage = () => {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email")?.trim() || "user@example.com";
    const encodedEmail = encodeURIComponent(email);
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [marketingAgreed, setMarketingAgreed] = useState(false);

    const rules = [
        { label: t("passwordRules.minLength"), valid: password.length >= 8 },
        { label: t("passwordRules.uppercase"), valid: /[A-Z]/.test(password) },
        { label: t("passwordRules.lowercase"), valid: /[a-z]/.test(password) },
        { label: t("passwordRules.number"), valid: /\d/.test(password) },
        { label: t("passwordRules.special"), valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
    const passwordIsValid = rules.every((rule) => rule.valid) && passwordsMatch;
    const canSubmit = displayName.trim().length > 0 && passwordIsValid && termsAgreed && privacyAgreed;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;

        router.push(`/verify?email=${encodedEmail}`);
    };

    return (
        <Card className="app-card gap-5 px-6 py-8">
            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-perfo-primary">PERFO</h1>
                </Link>
            </div>

            <CardHeader className="px-0 pb-0">
                <CardTitle className="text-base text-[var(--text-muted)]">{t("signup.title", { email })}</CardTitle>
                <CardDescription className="text-center">{t("signup.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="px-0">
                <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <Label htmlFor="display-name" className="text-xs font-bold text-perfo-primary">{t("common.displayName")}</Label>
                    <Input
                        id="display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t("common.displayNamePlaceholder")}
                        className="h-12 border-[#9bafd9] bg-white px-4 text-sm placeholder:text-[#b5c5e7]"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold text-perfo-primary">{t("common.password")}</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.createPasswordPlaceholder")}
                        className="h-12 border-[#9bafd9] bg-white px-4 pr-12 text-sm placeholder:text-[#b5c5e7]"
                        />
                        <button
                            type="button"
                            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-perfo-primary"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-bold text-perfo-primary">{t("common.confirmPassword")}</Label>
                    <div className="relative">
                        <Input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("common.confirmPasswordPlaceholder")}
                        className="h-12 border-[#9bafd9] bg-white px-4 pr-12 text-sm placeholder:text-[#b5c5e7]"
                        />
                        <button
                            type="button"
                            aria-label={showConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"}
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-perfo-primary"
                        >
                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2.5">
                    {rules.map((rule) => (
                        <PasswordRule key={rule.label} label={rule.label} valid={rule.valid} />
                    ))}
                    <PasswordRule label={t("passwordRules.match")} valid={passwordsMatch} />
                </div>

                <div className="space-y-3 rounded-lg border border-[#d7e2f7] bg-[#f8fbff] p-3">
                    <label className="flex items-start gap-3 text-sm text-[var(--text)]">
                        <input
                            type="checkbox"
                            checked={termsAgreed}
                            onChange={(event) => setTermsAgreed(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-[#9bafd9] accent-[#103783]"
                        />
                        <span>{t("signup.termsAgreement")}</span>
                    </label>
                    <label className="flex items-start gap-3 text-sm text-[var(--text)]">
                        <input
                            type="checkbox"
                            checked={privacyAgreed}
                            onChange={(event) => setPrivacyAgreed(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-[#9bafd9] accent-[#103783]"
                        />
                        <span>{t("signup.privacyAgreement")}</span>
                    </label>
                    <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
                        <input
                            type="checkbox"
                            checked={marketingAgreed}
                            onChange={(event) => setMarketingAgreed(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-[#9bafd9] accent-[#103783]"
                        />
                        <span>{t("signup.marketingAgreement")}</span>
                    </label>
                </div>

                <Button type="submit" disabled={!canSubmit} className="h-12 w-full">
                    {t("signup.signUp")}
                </Button>

                <p className="text-center text-xs text-[var(--text-subtle)]">
                    {t("common.termsPrefix")}{" "}
                    <Link href="#" className="text-perfo-secondary underline transition-colors hover:text-perfo-primary">
                        {t("common.termsLink")}
                    </Link>
                </p>
                </form>
            </CardContent>
        </Card>
    );
};

export default SignUpPage;
