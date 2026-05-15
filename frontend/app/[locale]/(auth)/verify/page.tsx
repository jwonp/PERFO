"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGNUP_DRAFT_STORAGE_KEY, type SignUpDraft } from "@/lib/auth/auth-flow";

const CODE_LENGTH = 6;

const VerifyPage = () => {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email")?.trim() ?? "";
    const mode = searchParams.get("mode") === "reset" ? "reset" : "signup";
    const purpose = mode === "reset" ? "PASSWORD_RESET" : "SIGN_UP";
    const [code, setCode] = useState(Array.from({ length: CODE_LENGTH }, () => ""));
    const [previewCode, setPreviewCode] = useState<string | null>(null);
    const [requestingCode, setRequestingCode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const requestedRef = useRef(false);
    const isCodeComplete = code.every((digit) => digit.length === 1);

    const updateCode = (nextCode: string[]) => {
        setCode(nextCode);
        setError(null);
    };

    const applyDigitsFrom = (index: number, rawValue: string) => {
        const digits = rawValue.replace(/\D/g, "");
        if (!digits) {
            const nextCode = [...code];
            nextCode[index] = "";
            updateCode(nextCode);
            return;
        }

        const nextCode = [...code];
        digits.split("").slice(0, CODE_LENGTH - index).forEach((digit, offset) => {
            nextCode[index + offset] = digit;
        });
        updateCode(nextCode);

        const nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
    };

    const requestCode = async () => {
        if (!email) {
            throw new Error(t("verify.missingEmail"));
        }

        setRequestingCode(true);
        setError(null);
        try {
            const response = await fetch("/api/auth/verification-codes/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, purpose }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(body.message ?? t("verify.requestFailed"));
            }
            setPreviewCode(body.previewCode ?? null);
        } finally {
            setRequestingCode(false);
        }
    };

    useEffect(() => {
        if (requestedRef.current) {
            return;
        }

        requestedRef.current = true;
        if (!email) {
            setError(t("verify.missingEmail"));
            return;
        }
        if (mode === "signup" && !window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY)) {
            setError(t("verify.missingDraft"));
            return;
        }
        void requestCode().catch((requestError) => {
            setError(requestError instanceof Error ? requestError.message : t("verify.requestFailed"));
        });
    }, [email, mode, purpose, t]);

    const handleChange = (index: number, value: string) => {
        applyDigitsFrom(index, value);
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
        if (event.key === "Backspace") {
            if (code[index]) {
                const nextCode = [...code];
                nextCode[index] = "";
                updateCode(nextCode);
                return;
            }

            if (index > 0) {
                const nextCode = [...code];
                nextCode[index - 1] = "";
                updateCode(nextCode);
                inputRefs.current[index - 1]?.focus();
            }
        }

        if (event.key === "ArrowLeft" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (event.key === "Enter" && isCodeComplete && !submitting) {
            event.preventDefault();
            void handleVerify();
        }
    };

    const handleVerify = async () => {
        if (!email) {
            setError(t("verify.missingEmail"));
            return;
        }
        if (!isCodeComplete) {
            setError(t("verify.codeIncomplete"));
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const verificationResponse = await fetch("/api/auth/verification-codes/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    purpose,
                    code: code.join(""),
                }),
            });
            const verificationBody = await verificationResponse.json().catch(() => ({}));
            if (!verificationResponse.ok) {
                throw new Error(verificationBody.message ?? t("verify.failed"));
            }

            if (mode === "reset") {
                router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(verificationBody.verificationToken)}`);
                return;
            }

            const draft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);
            if (!draft) {
                throw new Error(t("verify.missingDraft"));
            }

            const parsedDraft = JSON.parse(draft) as SignUpDraft;
            const signUpResponse = await fetch("/api/auth/signup/verified", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: parsedDraft.email,
                    password: parsedDraft.password,
                    name: parsedDraft.name,
                    verificationToken: verificationBody.verificationToken,
                }),
            });
            const signUpBody = await signUpResponse.json().catch(() => ({}));
            if (!signUpResponse.ok) {
                throw new Error(signUpBody.message ?? t("verify.signupFailed"));
            }

            window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
            const signInResult = await signIn("credentials", {
                email: parsedDraft.email,
                password: parsedDraft.password,
                redirect: false,
            });
            if (signInResult?.error) {
                throw new Error(signInResult.error);
            }
            router.push(`/signup/complete?email=${encodeURIComponent(parsedDraft.email)}`);
        } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : t("verify.failed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="app-card gap-5 px-6 py-8">
            <div className="text-center">
                <Link href="/">
                    <h1 className="text-2xl font-extrabold text-primary">
                        PERFO
                    </h1>
                </Link>
            </div>

            <CardHeader className="px-0 pb-0">
                <CardTitle className="text-base text-[var(--text-muted)]">
                    {t("verify.title", { email })}
                </CardTitle>
                <CardDescription className="text-center">{t("verify.subtitle")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-0">
                <div className="flex w-full justify-center gap-2.5 sm:gap-3">
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            ref={(element) => { inputRefs.current[index] = element; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            autoFocus={index === 0}
                            onChange={(event) => handleChange(index, event.target.value)}
                            onKeyDown={(event) => handleKeyDown(index, event)}
                            onFocus={(event) => event.currentTarget.select()}
                            onPaste={(event) => {
                                event.preventDefault();
                                applyDigitsFrom(index, event.clipboardData.getData("text"));
                            }}
                            aria-label={`verification-code-${index + 1}`}
                            className="h-12 w-10 rounded-lg border border-border bg-[var(--surface-raised)] text-center text-xl font-bold text-[var(--text)] outline-none transition-all focus:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-14 sm:w-12"
                        />
                    ))}
                </div>

                {previewCode ? (
                    <p className="text-center text-xs text-[var(--text-subtle)]">
                        {t("verify.previewCode", { code: previewCode })}
                    </p>
                ) : null}
                {error ? <p className="text-center text-sm text-[var(--danger)]">{error}</p> : null}

                <div className="flex w-full flex-col gap-3">
                    <Button type="button" className="h-12 w-full" disabled={submitting || requestingCode || !isCodeComplete} onClick={() => void handleVerify()}>
                        {submitting ? t("verify.verifying") : t("verify.verify")}
                    </Button>

                    <Button type="button" variant="outline" className="h-12 w-full" disabled={submitting || requestingCode} onClick={() => void requestCode().catch((requestError) => {
                        setError(requestError instanceof Error ? requestError.message : t("verify.requestFailed"));
                    })}>
                        {t("verify.resend")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VerifyPage;
