"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useState, useRef } from "react";

export default function VerifyPage() {
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
            <h2 className="text-xl font-semibold text-perfo-text mb-2 text-center">
                {t("verify.title", { email: "user@example.com" })}
            </h2>
            <p className="text-sm text-perfo-text/60 mb-10 text-center">
                {t("verify.subtitle")}
            </p>

            {/* 6-digit Code Input */}
            <div className="flex gap-2.5 sm:gap-3 mb-8 w-full justify-center">
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
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 border-perfo-secondary/40 bg-white text-perfo-text focus:border-perfo-primary focus:outline-none focus:ring-2 focus:ring-perfo-primary/20 transition-all"
                    />
                ))}
            </div>

            {/* Buttons */}
            <div className="w-full flex flex-col gap-3">
                <button
                    type="button"
                    className="w-full h-12 flex items-center justify-center bg-perfo-primary hover:bg-perfo-primary-hover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-perfo-primary/25"
                >
                    {t("verify.verify")}
                </button>

                <button
                    type="button"
                    className="w-full h-12 flex items-center justify-center border-2 border-perfo-secondary/40 bg-white hover:bg-perfo-bg text-perfo-text font-semibold rounded-xl transition-colors"
                >
                    {t("verify.resend")}
                </button>
            </div>
        </div>
    );
}
