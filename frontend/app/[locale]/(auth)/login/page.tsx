"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginPage = () => {
    const t = useTranslations();
    const [email, setEmail] = useState("");

    const handleSocialLogin = (provider: string) => {
        signIn(provider, { callbackUrl: "/" });
    };

    return (
        <Card className="border-border/80 bg-[var(--surface-raised)]">
            {/* Logo */}
            <div className="px-6 pt-6 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-6 pb-0">
                <Badge variant="info" className="w-fit">PERFO Access</Badge>
                <CardTitle className="text-2xl">{t("login.welcome")}</CardTitle>
                <CardDescription>{t("login.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6">
                <div className="space-y-2">
                    <Label htmlFor="email">{t("common.email")}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("common.emailPlaceholder")}
                        className="h-12"
                    />
                </div>

                <Button asChild className="h-12 w-full">
                    <Link href="/login/password">
                        {t("common.next")}
                    </Link>
                </Button>

                <div className="flex items-center">
                    <div className="h-px flex-1 bg-border" />
                    <span className="px-4 text-sm font-medium text-[var(--text-subtle)]">{t("common.or")}</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        type="button"
                        onClick={() => handleSocialLogin("google")}
                        variant="outline"
                        className="h-12 w-full justify-center gap-3"
                    >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t("login.google")}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => handleSocialLogin("naver")}
                        variant="outline"
                        className="h-12 w-full justify-center gap-3"
                    >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#03C75A">
                        <path d="M16.27 10.58 7.33 1H1v22h6.73V13.42L16.67 23H23V1h-6.73z" />
                    </svg>
                    {t("login.naver")}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => handleSocialLogin("line")}
                        variant="outline"
                        className="h-12 w-full justify-center gap-3"
                    >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#06C755">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.813 4.269 8.846 10.036 9.608.39.084.923.258 1.058.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.267 14.254 24 12.39 24 10.304zM7.84 13.06H5.56a.718.718 0 01-.72-.716V7.974a.72.72 0 011.44 0v3.652h1.56a.72.72 0 010 1.434zm2.32-.716a.72.72 0 01-1.44 0V7.974a.72.72 0 011.44 0v4.37zm5.2 0a.718.718 0 01-.42.654.716.716 0 01-.764-.108l-2.16-2.94v2.394a.72.72 0 01-1.44 0V7.974a.718.718 0 01.42-.654.716.716 0 01.764.108l2.16 2.94V7.974a.72.72 0 011.44 0v4.37zm4.24-2.93a.72.72 0 010 1.434h-1.56v.78h1.56a.72.72 0 010 1.434H16.04a.718.718 0 01-.72-.716V7.974c0-.396.324-.716.72-.716h2.28a.72.72 0 010 1.434h-1.56v.722h1.56z" />
                    </svg>
                    {t("login.line")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default LoginPage;
