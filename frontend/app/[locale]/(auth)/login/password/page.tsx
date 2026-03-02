"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function PasswordLoginPage() {
    const t = useTranslations();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex flex-col items-center">
            {/* Back button */}
            <div className="w-full mb-6">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-perfo-text/60 hover:text-perfo-text transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">{t("common.back")}</span>
                </Link>
            </div>

            {/* Logo */}
            <div className="mb-8 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">
                        PERFO
                    </h1>
                </Link>
            </div>

            {/* Heading */}
            <h2 className="text-xl font-semibold text-perfo-text mb-1">
                {t("passwordLogin.welcome", { email: "user@example.com" })}
            </h2>
            <p className="text-sm text-perfo-text/60 mb-8">
                {t("passwordLogin.subtitle")}
            </p>

            {/* Password Input */}
            <div className="w-full mb-2">
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-perfo-text/70 mb-1.5"
                >
                    {t("common.password")}
                </label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.passwordPlaceholder")}
                        className="w-full h-12 px-4 pr-12 rounded-xl border-2 border-perfo-secondary/40 bg-white text-perfo-text placeholder:text-perfo-secondary/60 focus:border-perfo-primary focus:outline-none focus:ring-2 focus:ring-perfo-primary/20 transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-perfo-secondary hover:text-perfo-primary transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Forgot password */}
            <div className="w-full text-right mb-6">
                <Link
                    href="/reset-password"
                    className="text-sm text-perfo-secondary hover:text-perfo-primary transition-colors font-medium"
                >
                    {t("passwordLogin.forgotPassword")}
                </Link>
            </div>

            {/* Next Button */}
            <button
                type="button"
                className="w-full h-12 flex items-center justify-center bg-perfo-primary hover:bg-perfo-primary-hover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-perfo-primary/25"
            >
                {t("common.next")}
            </button>
        </div>
    );
}
