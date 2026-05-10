"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { EMAIL_LOOKUP_FAILED_MESSAGE } from "@/lib/auth/auth-errors";
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

const LoginPage = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/reserved";
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

  return (
    <Card className="app-card gap-5 px-6 py-8">
      <div className="text-center">
        <Link href="/">
          <h1 className="text-2xl font-extrabold text-primary">PERFO</h1>
        </Link>
      </div>

      <CardHeader className="px-0 pb-0">
        <CardTitle className="text-base text-[var(--text-muted)]">
          {t("login.welcome")}
        </CardTitle>
        <CardDescription className="text-sm">
          {t("login.subtitle")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <form
          action={`/${locale}/login/password`}
          className="space-y-4"
          method="get"
          onSubmit={handleEmailContinue}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold text-primary">
              {t("common.email")}
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("common.emailPlaceholder")}
              className="h-12 border-border px-4 text-sm"
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <Button type="submit" className="h-12 w-full" disabled={submitting}>
            {submitting ? t("login.checkingEmail") : t("common.next")}
          </Button>
        </form>

        <div className="flex items-center py-3">
          <div className="h-px flex-1 bg-border" />
          <span className="px-4 text-xs font-bold uppercase text-[var(--text-subtle)]">
            {t("common.or")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3">
          <Button
            type="button"
            onClick={() => handleSocialLogin("google")}
            variant="outline"
            className="h-12 w-full justify-center gap-2 text-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("login.google")}
          </Button>

          <Button
            type="button"
            onClick={() => handleSocialLogin("naver")}
            variant="outline"
            className="h-12 w-full justify-center gap-2 text-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#03C75A">
              <path d="M16.27 10.58 7.33 1H1v22h6.73V13.42L16.67 23H23V1h-6.73z" />
            </svg>
            {t("login.naver")}
          </Button>

          <Button
            type="button"
            onClick={() => handleSocialLogin("line")}
            variant="outline"
            className="h-12 w-full justify-center gap-2 text-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#06C755">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.813 4.269 8.846 10.036 9.608.39.084.923.258 1.058.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.267 14.254 24 12.39 24 10.304zM7.84 13.06H5.56a.718.718 0 01-.72-.716V7.974a.72.72 0 011.44 0v3.652h1.56a.72.72 0 010 1.434zm2.32-.716a.72.72 0 01-1.44 0V7.974a.72.72 0 011.44 0v4.37zm5.2 0a.718.718 0 01-.42.654.716.716 0 01-.764-.108l-2.16-2.94v2.394a.72.72 0 01-1.44 0V7.974a.718.718 0 01.42-.654.716.716 0 01.764.108l2.16 2.94V7.974a.72.72 0 011.44 0v4.37zm4.24-2.93a.72.72 0 010 1.434h-1.56v.78h1.56a.72.72 0 010 1.434H16.04a.718.718 0 01-.72-.716V7.974c0-.396.324-.716.72-.716h2.28a.72.72 0 010 1.434h-1.56v.722h1.56z" />
            </svg>
            {t("login.line")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginPage;
