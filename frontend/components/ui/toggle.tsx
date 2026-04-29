import * as React from "react"

import { cn } from "@/lib/lib/utils"

const Toggle = ({
  checked,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean
}) => {
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
    </button>
  )
}

export { Toggle }
