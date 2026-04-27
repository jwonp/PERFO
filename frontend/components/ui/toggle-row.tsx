import * as React from "react"

import { cn } from "@/lib/lib/utils"
import { Toggle } from "@/components/ui/toggle"

const ToggleRow = ({
  checked,
  label,
  icon,
  className,
  onToggle,
  labelClassName,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  checked: boolean
  label: React.ReactNode
  icon?: React.ReactNode
  onToggle: () => void
  labelClassName?: string
}) => {
  return (
    <div
      className={cn("flex items-center justify-between py-4", className)}
      {...props}
    >
      <div className="flex items-center gap-3 text-perfo-text/70">
        {icon}
        <span className={cn("text-sm font-medium text-perfo-text", labelClassName)}>{label}</span>
      </div>
      <Toggle checked={checked} onClick={onToggle} />
    </div>
  )
}

export { ToggleRow }
