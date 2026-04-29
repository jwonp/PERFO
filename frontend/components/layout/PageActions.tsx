import { cn } from "@/lib/lib/utils"
import type { PageActionsProps } from "@/components/layout/page-shell.types"

const PageActions = ({ className, ...props }: PageActionsProps) => {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

export default PageActions
