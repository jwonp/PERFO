"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";

export const useLoginPage = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = requestedCallbackUrl || "/reserved";
  const hasCallbackUrl = Boolean(requestedCallbackUrl);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedEmail = email.trim();

  const handleSocialLogin = (provider: string) => {
    void signIn(provider, { callbackUrl });
  };

  const handleEmailContinue = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!normalizedEmail) {
      setError(t("login.emailRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`,
        {
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok && body.message !== EMAIL_LOOKUP_FAILED_MESSAGE) {
        throw new Error(body.message ?? t("login.lookupFailed"));
      }

      if (body.exists && body.provider === "credentials") {
        router.push(
          `/login/password?email=${encodeURIComponent(normalizedEmail)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
        return;
      }

      if (!body.exists) {
        router.push(`/signup?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      setError(
        t("login.socialAccountHint", { provider: body.provider ?? "social" }),
      );
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : t("login.lookupFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    t,
    locale,
    email,
    error,
    submitting,
    callbackUrl,
    hasCallbackUrl,
    setEmail,
    handleSocialLogin,
    handleEmailContinue,
  };
};
