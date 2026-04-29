import { cn } from "@/lib/lib/utils"
import type { PageHeaderProps } from "@/components/layout/page-shell.types"

const PageHeader = ({
  title,
  description,
  leading,
  trailing,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) => {
  return (
    <header className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {leading}
          <h1 className={cn("text-lg font-extrabold text-primary", titleClassName)}>
            {title}
          </h1>
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {description ? (
        <p className={cn("text-sm text-[var(--text-muted)]", descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </header>
  )
}

export default PageHeader
