import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";
import { Link } from "@/i18n/navigation";

const ForbiddenPage = () => {
  const t = useTranslations("errors");

  return (
    <StatusPage
      code="403"
      title={t("forbidden.title")}
      description={t("forbidden.description")}
      icon={<ShieldAlert className="size-5" />}
      primaryAction={
        <Button asChild className="h-12 w-full">
          <Link href="/">{t("actions.goHome")}</Link>
        </Button>
      }
      secondaryAction={
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href="/events">{t("actions.browseTickets")}</Link>
        </Button>
      }
    />
  );
};

export default ForbiddenPage;
