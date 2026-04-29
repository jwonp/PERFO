import type { ThemePreference } from "@/lib/theme/theme.types"

export const THEME_STORAGE_KEY = "perfo-theme"
export const THEME_DARK_CLASS = "dark"
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)"

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
]
