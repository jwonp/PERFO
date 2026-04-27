import * as React from "react"

import { cn } from "@/lib/lib/utils"

const Tabs = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      data-slot="tabs"
      className={cn("inline-flex items-center gap-1 rounded-lg border border-border bg-[var(--surface-muted)] p-1", className)}
      {...props}
    />
  )
}

const TabsButton = ({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) => {
  return (
    <button
      data-slot="tabs-button"
      data-active={active}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--surface-raised)] text-[var(--text)] shadow-[var(--shadow-soft)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsButton }
