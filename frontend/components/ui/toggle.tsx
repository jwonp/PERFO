import * as React from "react"

import { cn } from "@/lib/lib/utils"

const Toggle = ({
  checked,
  variant = "switch",
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean
  variant?: "switch" | "pill"
}) => {
  if (variant === "pill") {
    return (
      <button
        type="button"
        aria-pressed={checked}
        className={cn(
          "inline-flex min-h-9 items-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        checked ? "bg-primary" : "bg-[var(--surface-muted)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[var(--surface-raised)] shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
      {children}
    </button>
  )
}

export { Toggle }
