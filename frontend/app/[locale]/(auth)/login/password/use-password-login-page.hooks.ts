"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";

export const usePasswordLoginPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "user@example.com";
  const callbackUrl = searchParams.get("callbackUrl") || "/reserved";
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push(result?.url ?? callbackUrl);
  };

  return {
    t,
    email,
    password,
    showPassword,
    submitting,
    error,
    setPassword,
    setShowPassword,
    handleSubmit,
  };
};
