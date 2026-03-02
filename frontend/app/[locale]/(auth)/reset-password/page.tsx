"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react";

function PasswordRule({ label, valid }: { label: string; valid: boolean }) {
    return (
        <div className="flex items-center gap-2">
            {valid ? (
                <Check className="w-4 h-4 text-perfo-success shrink-0" />
            ) : (
                <X className="w-4 h-4 text-perfo-secondary/50 shrink-0" />
            )}
            <span className={`text-sm ${valid ? "text-perfo-success" : "text-perfo-text/40"}`}>
                {label}
            </span>
        </div>
    );
}

export default function ResetPasswordPage() {
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
        <div className="flex flex-col items-center">
            {/* Back button */}
            <div className="w-full mb-6">
                <Link
                    href="/login/password"
                    className="inline-flex items-center gap-2 text-perfo-text/60 hover:text-perfo-text transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">{t("common.back")}</span>
                </Link>
            </div>

            {/* Logo */}
            <div className="mb-8 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">PERFO</h1>
                </Link>
            </div>

            {/* Heading */}
            <h2 className="text-xl font-semibold text-perfo-text mb-1 text-center">
                {t("resetPassword.title")}
            </h2>
            <p className="text-sm text-perfo-text/60 mb-8 text-center">
                {t("resetPassword.subtitle", { email: "user@example.com" })}
            </p>

            {/* Password Input */}
            <div className="w-full mb-4">
                <label htmlFor="new-password" className="block text-sm font-medium text-perfo-text/70 mb-1.5">
                    {t("common.newPassword")}
                </label>
                <div className="relative">
                    <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.newPasswordPlaceholder")}
                        className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-perfo-secondary/40 bg-white text-perfo-text placeholder:text-perfo-secondary/60 focus:border-perfo-primary focus:outline-none focus:ring-2 focus:ring-perfo-primary/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-perfo-secondary hover:text-perfo-primary transition-colors">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Confirm Password Input */}
            <div className="w-full mb-4">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-perfo-text/70 mb-1.5">
                    {t("common.confirmPassword")}
                </label>
                <div className="relative">
                    <input
                        id="confirm-new-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("common.confirmNewPasswordPlaceholder")}
                        className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-perfo-secondary/40 bg-white text-perfo-text placeholder:text-perfo-secondary/60 focus:border-perfo-primary focus:outline-none focus:ring-2 focus:ring-perfo-primary/20 transition-all"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-perfo-secondary hover:text-perfo-primary transition-colors">
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Password Rules */}
            <div className="w-full bg-perfo-bg border border-perfo-secondary/20 rounded-xl p-4 mb-6 space-y-2.5">
                {rules.map((rule) => (
                    <PasswordRule key={rule.label} label={rule.label} valid={rule.valid} />
                ))}
                <PasswordRule label={t("passwordRules.match")} valid={passwordsMatch} />
            </div>

            {/* Reset Password Button */}
            <button
                type="button"
                className="w-full h-12 flex items-center justify-center bg-perfo-primary hover:bg-perfo-primary-hover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-perfo-primary/25"
            >
                {t("resetPassword.resetButton")}
            </button>
        </div>
    );
}
