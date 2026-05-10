"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SignUpCompletePage = () => {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const email = searchParams.get("email")?.trim() || "user@example.com";

    return (
        <Card className="border-0 bg-transparent py-0 text-center shadow-none">
            <CardHeader className="items-center px-6 pb-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-2xl text-[var(--text)]">
                    {t("signupComplete.title", { email })}
                </CardTitle>
                <CardDescription className="max-w-xs leading-relaxed">
                    {t("signupComplete.description")}
                </CardDescription>
            </CardHeader>

            <CardContent className="mt-32 px-0">
                <Button asChild className="h-12 w-full">
                    <Link href="/login">
                        {t("common.goToLogin")}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
};

export default SignUpCompletePage;
