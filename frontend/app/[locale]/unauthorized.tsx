import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";
import { Link } from "@/i18n/navigation";

const UnauthorizedPage = () => {
  const t = useTranslations("errors");

  return (
    <StatusPage
      code="401"
      title={t("unauthorized.title")}
      description={t("unauthorized.description")}
      icon={<LockKeyhole className="size-5" />}
      primaryAction={
        <Button asChild className="h-12 w-full">
          <Link href="/login">{t("actions.goToLogin")}</Link>
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

export default UnauthorizedPage;
