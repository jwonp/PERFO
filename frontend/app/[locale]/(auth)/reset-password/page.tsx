"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { PasswordRule } from "@/components/auth/password-rules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPasswordPage = () => {
    const t = useTranslations();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const rules = [
        { label: t("passwordRules.minLength"), valid: password.length >= 8 },
        { label: t("passwordRules.uppercase"), valid: /[A-Z]/.test(password) },
        { label: t("passwordRules.lowercase"), valid: /[a-z]/.test(password) },
        { label: t("passwordRules.number"), valid: /\d/.test(password) },
        { label: t("passwordRules.special"), valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];

    const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

    return (
        <Card className="border-border/80 bg-[var(--surface-raised)]">
            <div className="px-6 pt-6">
                <Link
                    href="/login/password"
                    className="inline-flex items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">{t("common.back")}</span>
                </Link>
            </div>

            <div className="px-6 pt-6 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">PERFO</h1>
                </Link>
            </div>

            <CardHeader className="px-6 pb-0">
                <Badge variant="warning" className="w-fit">Recovery</Badge>
                <CardTitle className="text-2xl text-center">{t("resetPassword.title")}</CardTitle>
                <CardDescription className="text-center">
                    {t("resetPassword.subtitle", { email: "user@example.com" })}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6">
                <div className="space-y-2">
                    <Label htmlFor="new-password">{t("common.newPassword")}</Label>
                    <div className="relative">
                        <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.newPasswordPlaceholder")}
                        className="h-12 pr-12"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-perfo-primary">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">{t("common.confirmPassword")}</Label>
                    <div className="relative">
                        <Input
                        id="confirm-new-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("common.confirmNewPasswordPlaceholder")}
                        className="h-12 pr-12"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-perfo-primary">
                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                <div className="rounded-lg border border-border bg-[var(--surface-muted)] p-4 space-y-2.5">
                    {rules.map((rule) => (
                        <PasswordRule key={rule.label} label={rule.label} valid={rule.valid} />
                    ))}
                    <PasswordRule label={t("passwordRules.match")} valid={passwordsMatch} />
                </div>

                <Button type="button" className="h-12 w-full">
                    {t("resetPassword.resetButton")}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ResetPasswordPage;
