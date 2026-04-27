import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--surface-muted)] text-[var(--text)]",
        info: "bg-[color:color-mix(in_srgb,var(--primary)_14%,white)] text-primary",
        success: "bg-[color:color-mix(in_srgb,var(--success)_14%,white)] text-[var(--success)]",
        warning: "bg-[color:color-mix(in_srgb,var(--warning)_16%,white)] text-[var(--warning)]",
        danger: "bg-[color:color-mix(in_srgb,var(--danger)_14%,white)] text-[var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

const Badge = ({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
