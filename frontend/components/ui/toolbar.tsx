import * as React from "react"

import { cn } from "@/lib/lib/utils"

const Toolbar = ({
  className,
  ...props
}: React.ComponentProps<"section">) => {
  return (
    <section
      data-slot="toolbar"
      className={cn("ds-toolbar rounded-lg border border-border px-4 py-4 sm:px-6", className)}
      {...props}
    />
  )
}

const ToolbarHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between", className)} {...props} />
}

const ToolbarTitle = ({
  className,
  ...props
}: React.ComponentProps<"h1">) => {
  return <h1 className={cn("text-lg font-semibold text-[var(--text)] sm:text-xl", className)} {...props} />
}

const ToolbarDescription = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return <p className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />
}

const ToolbarActions = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("flex items-center gap-2", className)} {...props} />
}

export { Toolbar, ToolbarHeader, ToolbarTitle, ToolbarDescription, ToolbarActions }
