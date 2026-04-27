import * as React from "react"

import { cn } from "@/lib/lib/utils"

const EmptyState = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[var(--surface-muted)] px-6 py-16 text-center", className)}
      {...props}
    />
  )
}

const EmptyStateIcon = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("mb-3 text-[var(--text-subtle)]", className)} {...props} />
}

const EmptyStateTitle = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return <p className={cn("text-sm font-medium text-[var(--text-muted)]", className)} {...props} />
}

export { EmptyState, EmptyStateIcon, EmptyStateTitle }
