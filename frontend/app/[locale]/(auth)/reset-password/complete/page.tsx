"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ResetPasswordCompletePage = () => {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const email = searchParams.get("email")?.trim() || "user@example.com";

    return (
        <Card className="app-card mx-auto max-w-md px-6 py-8 text-center">
            <CardHeader className="items-center gap-5 px-0 pb-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/10 bg-primary/10 shadow-[var(--shadow-soft)]">
                    <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} />
                </div>
                <CardTitle className="max-w-sm text-2xl leading-tight text-[var(--text)]">
                    {t("resetComplete.title", { email })}
                </CardTitle>
                <CardDescription className="max-w-xs leading-relaxed text-[var(--text-muted)]">
                    {t("resetComplete.description")}
                </CardDescription>
            </CardHeader>

            <CardContent className="px-0 pt-8">
                <Button asChild className="h-12 w-full">
                    <Link href="/login">
                        {t("common.goToLogin")}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

export default ResetPasswordCompletePage;
