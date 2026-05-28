"use client"

import * as React from "react"
import { cn } from "@/lib/lib/utils"

const Command = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />
}

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-subtle)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
})

CommandInput.displayName = "CommandInput"

const CommandList = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("max-h-72 overflow-y-auto", className)} {...props} />
}

const CommandEmpty = ({
  className,
  ...props
}: React.ComponentProps<"p">) => {
  return (
    <p
      className={cn("px-3 py-4 text-center text-sm text-[var(--text-subtle)]", className)}
      {...props}
    />
  )
}

const CommandGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return <div className={cn("space-y-1", className)} {...props} />
}

const CommandItem = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
})

CommandItem.displayName = "CommandItem"

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList }
