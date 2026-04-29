import { cn } from "@/lib/lib/utils"
import type { PageShellProps } from "@/components/layout/page-shell.types"

const PageShell = ({ className, ...props }: PageShellProps) => {
  return (
    <div
      className={cn("min-h-full bg-background text-foreground", className)}
      {...props}
    />
  )
}

export default PageShell
