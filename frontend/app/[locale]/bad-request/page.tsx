import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import StatusPage from "@/components/feedback/StatusPage";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const BadRequestPage = () => {
  const t = useTranslations("errors");

  return (
    <StatusPage
      code="400"
      title={t("badRequest.title")}
      description={t("badRequest.description")}
      icon={<AlertTriangle className="size-5" />}
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

export default BadRequestPage;
