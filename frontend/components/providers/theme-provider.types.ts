import type * as React from "react"

import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme.types"

export type ThemeProviderProps = {
  children: React.ReactNode
}

export type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}
