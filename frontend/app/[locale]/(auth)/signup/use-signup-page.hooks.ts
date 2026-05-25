"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";
import { saveSignUpDraft } from "@/lib/auth/auth-flow.storage";
import {
  createPasswordRuleDescriptors,
  doPasswordsMatch,
} from "@/lib/auth/password-rules.func";

export const useSignUpPage = () => {
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

  const rules = createPasswordRuleDescriptors(password).map((rule) => ({
    label: t(`passwordRules.${rule.key}`),
    valid: rule.valid,
  }));

  const passwordsMatch = doPasswordsMatch(password, confirmPassword);
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

      saveSignUpDraft({
        email,
        name: displayName.trim(),
        password,
      });
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

  return {
    t,
    email,
    displayName,
    password,
    confirmPassword,
    showPassword,
    showConfirm,
    termsAgreed,
    privacyAgreed,
    marketingAgreed,
    submitting,
    error,
    rules,
    passwordsMatch,
    canSubmit,
    setDisplayName,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirm,
    setTermsAgreed,
    setPrivacyAgreed,
    setMarketingAgreed,
    handleSubmit,
  };
};
