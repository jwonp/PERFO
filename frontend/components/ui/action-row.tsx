import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/lib/utils"

const ActionRow = ({
  className,
  ...props
}: React.ComponentProps<"button">) => {
  return (
    <button
      type="button"
      className={cn("flex w-full items-center justify-between py-4 text-left transition-colors hover:text-perfo-primary", className)}
      {...props}
    />
  )
}

const ActionRowLeading = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("flex items-center gap-3 text-perfo-text/70", className)} {...props} />
}

const ActionRowText = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  return <span className={cn("text-sm font-medium text-perfo-text", className)} {...props} />
}

const ActionRowChevron = ({
  className,
}: {
  className?: string
}) => {
  return <ChevronRight className={cn("h-4 w-4", className)} />
}

export { ActionRow, ActionRowLeading, ActionRowText, ActionRowChevron }
