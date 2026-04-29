import * as React from "react"

import { cn } from "@/lib/lib/utils"
import { Label } from "@/components/ui/label"

const FormField = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("space-y-1.5", className)} {...props} />
}

const FormFieldLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof Label>) => {
  return <Label className={cn("text-xs text-[var(--text-muted)]", className)} {...props} />
}

export { FormField, FormFieldLabel }
