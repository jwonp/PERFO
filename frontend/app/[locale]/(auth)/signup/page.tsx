"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PasswordRule } from "@/components/auth/password-rules";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SIGNUP_DRAFT_STORAGE_KEY,
  type SignUpDraft,
} from "@/lib/auth/auth-flow";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";

const SignUpPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() || "user@example.com";
  const encodedEmail = encodeURIComponent(email);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = [
    { label: t("passwordRules.minLength"), valid: password.length >= 8 },
    { label: t("passwordRules.uppercase"), valid: /[A-Z]/.test(password) },
    { label: t("passwordRules.lowercase"), valid: /[a-z]/.test(password) },
    { label: t("passwordRules.number"), valid: /\d/.test(password) },
    {
      label: t("passwordRules.special"),
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;
  const passwordIsValid = rules.every((rule) => rule.valid) && passwordsMatch;
  const canSubmit =
    displayName.trim().length > 0 &&
    passwordIsValid &&
    termsAgreed &&
    privacyAgreed;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/auth/check-email?email=${encodeURIComponent(email)}`,
        {
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok && body.message !== EMAIL_LOOKUP_FAILED_MESSAGE) {
        throw new Error(body.message ?? t("signup.submitFailed"));
      }
      if (body.exists) {
        throw new Error(
          body.provider === "credentials"
            ? t("signup.emailExists")
            : t("signup.socialAccountHint", {
                provider: body.provider ?? "social",
              }),
        );
      }

      const draft: SignUpDraft = {
        email,
        name: displayName.trim(),
        password,
      };
      window.sessionStorage.setItem(
        SIGNUP_DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
      );
      router.push(`/verify?email=${encodedEmail}&mode=signup`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("signup.submitFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="app-card gap-6 px-6 py-8">
      <div className="text-center">
        <Link href="/">
          <h1 className="text-2xl font-extrabold text-primary">PERFO</h1>
        </Link>
      </div>

      <CardHeader className="px-0 pb-0">
        <CardTitle className="text-base text-[var(--text-muted)]">
          {t("signup.title", { email })}
        </CardTitle>
        <CardDescription className="text-center">
          {t("signup.subtitle")}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-border bg-[var(--surface-muted)]/55 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
              {t("common.email")}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">
              {email}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="display-name"
              className="text-xs font-bold text-primary"
            >
              {t("common.displayName")}
            </Label>
            <Input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("common.displayNamePlaceholder")}
              className="h-12 border-border px-4 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-bold text-primary"
            >
              {t("common.password")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("common.createPasswordPlaceholder")}
                className="h-12 border-border px-4 pr-12 text-sm"
              />
              <button
                type="button"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-primary"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-xs font-bold text-primary"
            >
              {t("common.confirmPassword")}
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("common.confirmPasswordPlaceholder")}
                className="h-12 border-border px-4 pr-12 text-sm"
              />
              <button
                type="button"
                aria-label={
                  showConfirm ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"
                }
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-primary"
              >
                {showConfirm ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-border bg-[var(--surface-muted)]/55 p-4">
            {rules.map((rule) => (
              <PasswordRule
                key={rule.label}
                label={rule.label}
                valid={rule.valid}
              />
            ))}
            <PasswordRule
              label={t("passwordRules.match")}
              valid={passwordsMatch}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-[var(--surface-muted)] p-3">
            <label className="flex items-start gap-3 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(event) => setTermsAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span>{t("signup.termsAgreement")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(event) => setPrivacyAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span>{t("signup.privacyAgreement")}</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={marketingAgreed}
                onChange={(event) => setMarketingAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span>{t("signup.marketingAgreement")}</span>
            </label>
          </div>

          {error ? (
            <p className="rounded-xl border border-[color:color-mix(in_srgb,var(--danger)_22%,white)] bg-[color:color-mix(in_srgb,var(--danger)_10%,white)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="h-12 w-full"
            >
              {submitting ? t("signup.sendingCode") : t("signup.signUp")}
            </Button>

            <p className="text-center text-xs text-[var(--text-subtle)]">
              {t("common.termsPrefix")}{" "}
              <Link
                href="#"
                className="text-[var(--text-muted)] underline transition-colors hover:text-primary"
              >
                {t("common.termsLink")}
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignUpPage;
