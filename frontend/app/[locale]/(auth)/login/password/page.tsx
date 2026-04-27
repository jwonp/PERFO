"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PasswordLoginPage = () => {
    const t = useTranslations();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Card className="border-border/80 bg-[var(--surface-raised)]">
            <div className="px-6 pt-6">
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                >
                    <ArrowLeft className="size-5" />
                    <span className="text-sm font-medium">{t("common.back")}</span>
                </Link>
            </div>

            <div className="px-6 pt-6 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-6 pb-0">
                <Badge variant="warning" className="w-fit">Secure Step</Badge>
                <CardTitle className="text-2xl">
                    {t("passwordLogin.welcome", { email: "user@example.com" })}
                </CardTitle>
                <CardDescription>{t("passwordLogin.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6">
                <div className="space-y-2">
                    <Label htmlFor="password">{t("common.password")}</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("common.passwordPlaceholder")}
                        className="h-12 pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
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
