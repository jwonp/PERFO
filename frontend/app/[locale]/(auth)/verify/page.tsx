"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VerifyPage = () => {
    const t = useTranslations();
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <Card className="border-border/80 bg-[var(--surface-raised)]">
            <div className="px-6 pt-6 lg:hidden">
                <Link href="/">
                    <h1 className="text-4xl font-extrabold text-perfo-primary tracking-tight">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-6 pb-0">
                <Badge variant="warning" className="w-fit">Verification</Badge>
                <CardTitle className="text-2xl text-center">
                    {t("verify.title", { email: "user@example.com" })}
                </CardTitle>
                <CardDescription className="text-center">{t("verify.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6">
                <div className="flex w-full justify-center gap-2.5 sm:gap-3">
                    {code.map((digit, index) => (
                        <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="h-14 w-12 rounded-lg border border-border bg-[var(--surface-raised)] text-center text-2xl font-bold text-[var(--text)] outline-none transition-all focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-16 sm:w-14"
                    />
                    ))}
                </div>

                <div className="flex w-full flex-col gap-3">
                    <Button type="button" className="h-12 w-full">
                        {t("verify.verify")}
                    </Button>

                    <Button type="button" variant="outline" className="h-12 w-full">
                        {t("verify.resend")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VerifyPage;
