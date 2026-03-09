"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const t = useTranslations();
    const [email, setEmail] = useState("");

    const handleSocialLogin = (provider: string) => {
        signIn(provider, { callbackUrl: "/" });
    };

    return (
        <div className="flex flex-col items-center">
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
                {t("login.welcome")}
            </h2>
            <p className="text-sm text-perfo-text/60 mb-8">
                {t("login.subtitle")}
            </p>

            {/* Email Input */}
            <div className="w-full mb-4">
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-perfo-text/70 mb-1.5"
                >
                    {t("common.email")}
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("common.emailPlaceholder")}
                    className="w-full h-12 px-4 rounded-xl border-2 border-perfo-secondary/40 bg-white text-perfo-text placeholder:text-perfo-secondary/60 focus:border-perfo-primary focus:outline-none focus:ring-2 focus:ring-perfo-primary/20 transition-all"
                />
            </div>

            {/* Next Button */}
            <Link
                href="/login/password"
                className="w-full h-12 flex items-center justify-center bg-perfo-primary hover:bg-perfo-primary-hover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-perfo-primary/25"
            >
                {t("common.next")}
            </Link>

            {/* Divider */}
            <div className="flex items-center w-full my-8">
                <div className="flex-1 h-px bg-perfo-secondary/30" />
                <span className="px-4 text-sm text-perfo-text/40 font-medium">{t("common.or")}</span>
                <div className="flex-1 h-px bg-perfo-secondary/30" />
            </div>

            {/* Social Login Buttons */}
            <div className="w-full flex flex-col gap-3">
                <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    className="w-full h-12 flex items-center justify-center gap-3 border-2 border-perfo-secondary/30 rounded-xl bg-white hover:bg-perfo-bg text-perfo-text font-medium transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t("login.google")}
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin("kakao")}
                    className="w-full h-12 flex items-center justify-center gap-3 border-2 border-perfo-secondary/30 rounded-xl bg-white hover:bg-perfo-bg text-perfo-text font-medium transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FEE500">
                        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.73l-.96 3.53c-.05.18.02.38.17.49.09.06.19.1.3.1.09 0 .18-.03.26-.08L10.3 18.8c.55.07 1.12.1 1.7.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                    </svg>
                    {t("login.kakao")}
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin("naver")}
                    className="w-full h-12 flex items-center justify-center gap-3 border-2 border-perfo-secondary/30 rounded-xl bg-white hover:bg-perfo-bg text-perfo-text font-medium transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#03C75A">
                        <path d="M16.27 10.58 7.33 1H1v22h6.73V13.42L16.67 23H23V1h-6.73z" />
                    </svg>
                    {t("login.naver")}
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin("line")}
                    className="w-full h-12 flex items-center justify-center gap-3 border-2 border-perfo-secondary/30 rounded-xl bg-white hover:bg-perfo-bg text-perfo-text font-medium transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#06C755">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.813 4.269 8.846 10.036 9.608.39.084.923.258 1.058.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.267 14.254 24 12.39 24 10.304zM7.84 13.06H5.56a.718.718 0 01-.72-.716V7.974a.72.72 0 011.44 0v3.652h1.56a.72.72 0 010 1.434zm2.32-.716a.72.72 0 01-1.44 0V7.974a.72.72 0 011.44 0v4.37zm5.2 0a.718.718 0 01-.42.654.716.716 0 01-.764-.108l-2.16-2.94v2.394a.72.72 0 01-1.44 0V7.974a.718.718 0 01.42-.654.716.716 0 01.764.108l2.16 2.94V7.974a.72.72 0 011.44 0v4.37zm4.24-2.93a.72.72 0 010 1.434h-1.56v.78h1.56a.72.72 0 010 1.434H16.04a.718.718 0 01-.72-.716V7.974c0-.396.324-.716.72-.716h2.28a.72.72 0 010 1.434h-1.56v.722h1.56z" />
                    </svg>
                    {t("login.line")}
                </button>
            </div>
        </div>
    );
}
