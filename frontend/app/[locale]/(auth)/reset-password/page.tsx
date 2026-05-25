"use client";

import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { PasswordRule } from "@/components/auth/password-rules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordPage } from "./use-reset-password-page.hooks";

const ResetPasswordPage = () => {
    const {
        t,
        email,
        password,
        confirmPassword,
        showPassword,
        showConfirm,
        submitting,
        error,
        rules,
        passwordsMatch,
        canSubmit,
        setPassword,
        setConfirmPassword,
        setShowPassword,
        setShowConfirm,
        handleSubmit,
    } = useResetPasswordPage();

    return (
        <Card className="app-card gap-5 px-6 py-8">
            <div>
                <Link
                    href={`/verify?email=${encodeURIComponent(email)}&mode=reset`}
                    className="inline-flex items-center gap-2 text-[var(--text)] transition-colors hover:text-primary"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">{t("common.back")}</span>
                </Link>
            </div>

            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-primary">PERFO</h1>
                </Link>
            </div>

            <CardHeader className="px-0 pb-0">
                <CardTitle className="text-base text-[var(--text-muted)]">{t("resetPassword.title")}</CardTitle>
                <CardDescription className="text-center">
                    {t("resetPassword.subtitle", { email })}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-0">
                <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs font-bold text-primary">{t("common.newPassword")}</Label>
                    <div className="relative">
                        <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={t("common.newPasswordPlaceholder")}
                            className="h-12 border-border px-4 pr-12 text-sm"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-primary">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-xs font-bold text-primary">{t("common.confirmPassword")}</Label>
                    <div className="relative">
                        <Input
                            id="confirm-new-password"
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder={t("common.confirmNewPasswordPlaceholder")}
                            className="h-12 border-border px-4 pr-12 text-sm"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-primary">
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

                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

                <Button type="button" className="h-12 w-full" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
                    {submitting ? t("resetPassword.resetting") : t("resetPassword.resetButton")}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ResetPasswordPage;
