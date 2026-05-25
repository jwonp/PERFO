"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import {
  clearSignUpDraft,
  getSignUpDraft,
  hasSignUpDraft,
} from "@/lib/auth/auth-flow.storage";

const CODE_LENGTH = 6;

export const useVerifyPage = () => {
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
    digits
      .split("")
      .slice(0, CODE_LENGTH - index)
      .forEach((digit, offset) => {
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
    if (mode === "signup" && !hasSignUpDraft()) {
      setError(t("verify.missingDraft"));
      return;
    }
    void requestCode().catch((requestError) => {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("verify.requestFailed"),
      );
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
      const verificationResponse = await fetch(
        "/api/auth/verification-codes/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            purpose,
            code: code.join(""),
          }),
        },
      );
      const verificationBody = await verificationResponse.json().catch(() => ({}));
      if (!verificationResponse.ok) {
        throw new Error(verificationBody.message ?? t("verify.failed"));
      }

      if (mode === "reset") {
        router.push(
          `/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(verificationBody.verificationToken)}`,
        );
        return;
      }

      const parsedDraft = getSignUpDraft();
      if (!parsedDraft) {
        throw new Error(t("verify.missingDraft"));
      }
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

      clearSignUpDraft();
      const signInResult = await signIn("credentials", {
        email: parsedDraft.email,
        password: parsedDraft.password,
        redirect: false,
      });
      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }
      router.push(
        `/signup/complete?email=${encodeURIComponent(parsedDraft.email)}`,
      );
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : t("verify.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = () => {
    void requestCode().catch((requestError) => {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("verify.requestFailed"),
      );
    });
  };

  return {
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
  };
};
