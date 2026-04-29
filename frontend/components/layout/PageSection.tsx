import { cn } from "@/lib/lib/utils"
import type { PageSectionProps } from "@/components/layout/page-shell.types"

const sectionSpacing = {
  sm: "space-y-3",
  md: "space-y-5",
  lg: "space-y-6",
} satisfies Record<NonNullable<PageSectionProps["spacing"]>, string>

const PageSection = ({
  className,
  spacing = "md",
  ...props
}: PageSectionProps) => {
  return (
    <section
      className={cn(sectionSpacing[spacing], className)}
      {...props}
    />
  )
}

export default PageSection
