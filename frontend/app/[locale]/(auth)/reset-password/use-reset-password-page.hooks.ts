"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  createPasswordRuleDescriptors,
  doPasswordsMatch,
} from "@/lib/auth/password-rules.func";

export const useResetPasswordPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim() || "user@example.com";
  const token = searchParams.get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = createPasswordRuleDescriptors(password).map((rule) => ({
    label: t(`passwordRules.${rule.key}`),
    valid: rule.valid,
  }));

  const passwordsMatch = doPasswordsMatch(password, confirmPassword);
  const canSubmit =
    token.length > 0 && rules.every((rule) => rule.valid) && passwordsMatch;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          verificationToken: token,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message ?? t("resetPassword.failed"));
      }

      router.push(`/reset-password/complete?email=${encodeURIComponent(email)}`);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : t("resetPassword.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    t,
    email,
    password,
    confirmPassword,
    showPassword,
    showConfirm,
    submitting,
    error,
    rules,
    passwordsMatch,
    canSubmit,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirm,
    handleSubmit,
  };
};
