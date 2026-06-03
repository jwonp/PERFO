import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@jwonp/design-system"
import { cn } from "@/lib/lib/utils"
import type { PageEmptyStateProps } from "@/components/layout/page-shell.types"

const PageEmptyState = ({
  icon,
  title,
  description,
  className,
}: PageEmptyStateProps) => {
  return (
    <Empty className={cn(className)}>
      <EmptyHeader>
        {icon ? <EmptyMedia>{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  )
}

export default PageEmptyState
