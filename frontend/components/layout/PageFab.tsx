import { Button } from "@/components/ui/button"
import { cn } from "@/lib/lib/utils"
import type { PageFabProps } from "@/components/layout/page-shell.types"

const insetClass = {
  app: "right-[calc(50%-195px)] max-[430px]:right-5",
  screen: "right-5",
} satisfies Record<NonNullable<PageFabProps["inset"]>, string>

const PageFab = ({
  className,
  inset = "app",
  ...props
}: PageFabProps) => {
  return (
    <Button
      size="icon-lg"
      className={cn(
        "fixed bottom-24 z-30 size-14 rounded-full shadow-[var(--shadow-panel)]",
        insetClass[inset],
        className
      )}
      {...props}
    />
  )
}

export default PageFab
