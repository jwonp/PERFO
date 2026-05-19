"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";
import { Link } from "@/i18n/navigation";

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

const ErrorPage = ({
  error,
  unstable_retry,
}: ErrorPageProps) => {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      title={t("server.title")}
      description={t("server.description")}
      icon={<AlertTriangle className="size-5" />}
      primaryAction={
        <Button type="button" className="h-12 w-full" onClick={unstable_retry}>
          {t("actions.retry")}
        </Button>
      }
      secondaryAction={
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href="/">{t("actions.goHome")}</Link>
        </Button>
      }
    />
  );
};

export default ErrorPage;
