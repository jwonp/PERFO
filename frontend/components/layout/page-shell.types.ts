import type * as React from "react"

export type PageShellProps = React.ComponentProps<"div">

export type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export type PageSectionProps = React.ComponentProps<"section"> & {
  spacing?: "sm" | "md" | "lg"
}

export type PageActionsProps = React.ComponentProps<"div">

export type PageEmptyStateProps = {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  className?: string
}

export type PageFabProps = React.ComponentProps<"button"> & {
  inset?: "app" | "screen"
}

export type PageFilterBarProps = React.ComponentProps<"div">
