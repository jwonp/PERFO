import * as React from "react"

import { cn } from "@/lib/lib/utils"

const StatCard = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="stat-card"
      className={cn("ds-kpi rounded-lg border border-border p-4", className)}
      {...props}
    />
  )
}

const StatLabel = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("text-xs font-medium text-[var(--text-subtle)]", className)} {...props} />
}

const StatValue = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("mt-1 text-xl font-semibold text-[var(--text)]", className)} {...props} />
}

const StatMeta = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("mt-2 text-sm text-[var(--text-muted)]", className)} {...props} />
}

export { StatCard, StatLabel, StatValue, StatMeta }
