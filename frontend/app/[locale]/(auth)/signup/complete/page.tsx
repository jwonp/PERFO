import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SignUpCompletePage = () => {
    const t = useTranslations();

    return (
        <Card className="border-border/80 bg-[var(--surface-raised)] text-center">
            <CardHeader className="items-center px-6 pb-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-perfo-primary/10">
                    <CheckCircle className="h-14 w-14 text-perfo-primary" strokeWidth={1.5} />
                </div>
                <Badge variant="success">Account Ready</Badge>
                <CardTitle className="text-2xl">
                    {t("signupComplete.title", { email: "user@example.com" })}
                </CardTitle>
                <CardDescription className="max-w-xs leading-relaxed">
                    {t("signupComplete.description")}
                </CardDescription>
            </CardHeader>

            <CardContent className="px-6">
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
