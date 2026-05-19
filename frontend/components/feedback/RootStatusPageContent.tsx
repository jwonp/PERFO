"use client";

import { usePathname } from "next/navigation";
import { AlertTriangle, LockKeyhole, SearchX, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusPage from "@/components/feedback/StatusPage";
import { localeErrors, resolveLocaleFromPathname } from "@/components/feedback/root-status-copy";

type RootStatusKind = "badRequest" | "forbidden" | "notFound" | "server" | "unauthorized";

type RootStatusPageContentProps = {
  kind: RootStatusKind;
  onRetry?: () => void;
};

const iconMap = {
  badRequest: <AlertTriangle className="size-5" />,
  forbidden: <ShieldAlert className="size-5" />,
  notFound: <SearchX className="size-5" />,
  server: <AlertTriangle className="size-5" />,
  unauthorized: <LockKeyhole className="size-5" />,
} as const;

const codeMap: Record<RootStatusKind, string> = {
  badRequest: "400",
  forbidden: "403",
  notFound: "404",
  server: "500",
  unauthorized: "401",
};

const RootStatusPageContent = ({
  kind,
  onRetry,
}: RootStatusPageContentProps) => {
  const pathname = usePathname();
  const locale = resolveLocaleFromPathname(pathname);
  const messages = localeErrors[locale];
  const hrefBase = `/${locale}`;

  return (
    <StatusPage
      code={codeMap[kind]}
      title={messages[kind].title}
      description={messages[kind].description}
      icon={iconMap[kind]}
      primaryAction={
        onRetry ? (
          <Button type="button" className="h-12 w-full" onClick={onRetry}>
            {messages.actions.retry}
          </Button>
        ) : (
          <Button asChild className="h-12 w-full">
            <a href={hrefBase}>{messages.actions.goHome}</a>
          </Button>
        )
      }
      secondaryAction={
        onRetry ? (
          <Button asChild variant="outline" className="h-12 w-full">
            <a href={hrefBase}>{messages.actions.goHome}</a>
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-12 w-full">
            <a href={`${hrefBase}/events`}>{messages.actions.browseTickets}</a>
          </Button>
        )
      }
    />
  );
};

export default RootStatusPageContent;
