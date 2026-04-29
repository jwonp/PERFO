import { cn } from "@/lib/lib/utils"
import type { PageFilterBarProps } from "@/components/layout/page-shell.types"

const PageFilterBar = ({ className, ...props }: PageFilterBarProps) => {
  return (
    <div
      className={cn("flex items-center gap-2 overflow-x-auto pb-0.5", className)}
      {...props}
    />
  )
}

export default PageFilterBar
