"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/lib/utils"

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

const usePopoverContext = () => {
  const context = React.useContext(PopoverContext)

  if (!context) {
    throw new Error("Popover components must be used within Popover")
  }

  return context
}

const Popover = ({
  open: controlledOpen,
  onOpenChange,
  children,
}: React.PropsWithChildren<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const open = controlledOpen ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen)

      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen)
      }
    },
    [controlledOpen, onOpenChange]
  )

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Node)) {
        return
      }

      const clickedTrigger = triggerRef.current?.contains(target) ?? false
      const clickedContent = contentRef.current?.contains(target) ?? false

      if (!clickedTrigger && !clickedContent) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, setOpen])

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div className="relative">{children}</div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = ({
  asChild = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) => {
  const { open, setOpen, triggerRef } = usePopoverContext()
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      {...(!asChild ? { type: "button" } : {})}
      ref={triggerRef}
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn(className)}
      onClick={(event) => {
        props.onClick?.(event)

        if (!event.defaultPrevented) {
          setOpen(!open)
        }
      }}
      {...props}
    >
      {children}
    </Comp>
  )
}

const PopoverContent = ({
  align = "start",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
}) => {
  const { open, contentRef } = usePopoverContext()

  if (!open) {
    return null
  }

  return (
    <div
      ref={contentRef}
      role="dialog"
      className={cn(
        "absolute top-full z-50 mt-2 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-panel)]",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Popover, PopoverContent, PopoverTrigger }
