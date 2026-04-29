import { EmptyState, EmptyStateIcon, EmptyStateTitle } from "@/components/ui/empty-state"
import { cn } from "@/lib/lib/utils"
import type { PageEmptyStateProps } from "@/components/layout/page-shell.types"

const PageEmptyState = ({
  icon,
  title,
  description,
  className,
}: PageEmptyStateProps) => {
  return (
    <EmptyState className={cn(className)}>
      {icon ? <EmptyStateIcon>{icon}</EmptyStateIcon> : null}
      <EmptyStateTitle>{title}</EmptyStateTitle>
      {description ? (
        <p className="mt-2 text-sm text-[var(--text-subtle)]">{description}</p>
      ) : null}
    </EmptyState>
  )
}

export default PageEmptyState
