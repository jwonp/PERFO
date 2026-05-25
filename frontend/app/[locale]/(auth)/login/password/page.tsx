"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePasswordLoginPage } from "./use-password-login-page.hooks";

const PasswordLoginPage = () => {
    const {
        t,
        email,
        password,
        showPassword,
        submitting,
        error,
        setPassword,
        setShowPassword,
        handleSubmit,
    } = usePasswordLoginPage();

    return (
        <Card className="app-card gap-5 px-6 py-8">
            <div className="px-6 pt-6">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-[var(--text)] transition-colors hover:text-primary"
                >
                    <ArrowLeft className="size-5" />
                    <span className="sr-only">{t("common.back")}</span>
                </Link>
            </div>

            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-primary">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-0 pb-0">
                <CardTitle className="text-base text-[var(--text-muted)]">
                    {t("passwordLogin.welcome", { email })}
                </CardTitle>
                <CardDescription>{t("passwordLogin.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-0">
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold text-primary">{t("common.password")}</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={t("common.passwordPlaceholder")}
                            className="h-12 border-border px-4 pr-12 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-primary"
                        >
                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                    </div>
                </div>

                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

                <div className="text-right">
                    <Link
                        href={`/verify?email=${encodeURIComponent(email)}&mode=reset`}
                        className="text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-primary"
                    >
                        {t("passwordLogin.forgotPassword")}
                    </Link>
                </div>

                <Button type="button" className="h-12 w-full" onClick={() => void handleSubmit()} disabled={submitting}>
                    {submitting ? t("passwordLogin.signingIn") : t("common.next")}
                </Button>
            </CardContent>
        </Card>
    );
};

export default PasswordLoginPage;
