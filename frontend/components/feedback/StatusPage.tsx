import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, Kicker, H1, Muted } from "@jwonp/design-system";
import PageShell from "@/components/layout/PageShell";
import { cn } from "@/lib/lib/utils";

type StatusPageProps = {
  code: string;
  title: ReactNode;
  description: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const StatusPage = ({
  code,
  title,
  description,
  primaryAction,
  secondaryAction,
  icon,
  className,
}: StatusPageProps) => {
  return (
    <PageShell className={cn("ds-shell min-h-screen", className)}>
      <main className="mx-auto flex min-h-screen w-full max-w-[430px] items-center px-4 py-10">
        <Card className="app-card w-full gap-0 overflow-hidden">
          <div className="border-b border-border bg-[var(--surface-muted)]/70 px-6 py-4">
            <Kicker className="text-[var(--text-subtle)]">HTTP {code}</Kicker>
          </div>

          <CardHeader className="items-start px-6 pb-0 pt-6 text-left">
            {icon ? (
              <div className="mb-1 inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-[var(--surface-muted)] text-primary">
                {icon}
              </div>
            ) : null}
            <H1 className="text-2xl leading-tight font-bold text-primary">
              {title}
            </H1>
            <Muted className="max-w-sm leading-6">
              {description}
            </Muted>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">{primaryAction}</div>
              {secondaryAction ? (
                <div className="flex-1">{secondaryAction}</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>
    </PageShell>
  );
};

export default StatusPage;
export type { StatusPageProps };
