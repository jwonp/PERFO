"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PasswordLoginPage = () => {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "user@example.com";
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Card className="app-card gap-5 px-6 py-8">
            <div className="px-6 pt-6">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-[var(--text)] transition-colors hover:text-perfo-primary"
                >
                    <ArrowLeft className="size-5" />
                    <span className="sr-only">{t("common.back")}</span>
                </Link>
            </div>

            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-perfo-primary">
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
                    <Label htmlFor="password" className="text-xs font-bold text-perfo-primary">{t("common.password")}</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.passwordPlaceholder")}
                        className="h-12 border-[#9bafd9] bg-white px-4 pr-12 text-sm placeholder:text-[#b5c5e7]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                            className="absolute top-1/2 right-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-perfo-primary"
                        >
                            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                    </div>
                </div>

                <div className="text-right">
                    <Link
                        href="/reset-password"
                        className="text-sm font-medium text-perfo-secondary transition-colors hover:text-perfo-primary"
                    >
                        {t("passwordLogin.forgotPassword")}
                    </Link>
                </div>

                <Button type="button" className="h-12 w-full">
                    {t("common.next")}
                </Button>
            </CardContent>
        </Card>
    );
};

export default PasswordLoginPage;
