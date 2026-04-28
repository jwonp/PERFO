import * as React from "react"

import { cn } from "@/lib/lib/utils"

const BottomSheet = ({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) => {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className={cn("fixed right-0 bottom-0 left-0 z-[70] max-h-[90vh] overflow-y-auto rounded-t-[28px] border border-border/60 bg-[var(--surface-raised)] shadow-2xl", className)}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--text-subtle)]/35" />
        </div>
        {children}
      </div>
    </>
  )
}

const BottomSheetContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("px-5 pt-2 pb-8", className)} {...props} />
}

const BottomSheetTitle = ({
  className,
  ...props
}: React.ComponentProps<"h2">) => {
  return <h2 className={cn("mb-5 text-base font-bold text-[var(--text)]", className)} {...props} />
}

export { BottomSheet, BottomSheetContent, BottomSheetTitle }
