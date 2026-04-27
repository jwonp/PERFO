"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState, useRef } from "react";
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
        <Card className="app-card gap-5 px-6 py-8">
            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-perfo-primary">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-0 pb-0">
                <CardTitle className="text-base text-[var(--text-muted)]">
                    {t("verify.title", { email: "user@example.com" })}
                </CardTitle>
                <CardDescription className="text-center">{t("verify.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-0">
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
                        className="h-12 w-10 rounded-lg border border-[#9bafd9] bg-white text-center text-xl font-bold text-[var(--text)] outline-none transition-all focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-14 sm:w-12"
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
