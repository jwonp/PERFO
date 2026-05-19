import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";
import { Link } from "@/i18n/navigation";

const LocalizedNotFoundPage = () => {
  const t = useTranslations("errors");

  return (
    <StatusPage
      code="404"
      title={t("notFound.title")}
      description={t("notFound.description")}
      icon={<SearchX className="size-5" />}
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

export default LocalizedNotFoundPage;
