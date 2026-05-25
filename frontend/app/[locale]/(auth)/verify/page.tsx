"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyPage } from "./use-verify-page.hooks";

const VerifyPage = () => {
    const {
        t,
        email,
        code,
        previewCode,
        requestingCode,
        submitting,
        error,
        inputRefs,
        isCodeComplete,
        handleChange,
        handleKeyDown,
        handleVerify,
        handleResend,
        applyDigitsFrom,
    } = useVerifyPage();

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

                    <Button type="button" variant="outline" className="h-12 w-full" disabled={submitting || requestingCode} onClick={handleResend}>
                        {t("verify.resend")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default VerifyPage;
