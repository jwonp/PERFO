import {
  THEME_DARK_CLASS,
  THEME_MEDIA_QUERY,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from "@/lib/theme/theme.constants"
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme.types"

const isThemePreference = (value: string | null): value is ThemePreference => {
  return (
    typeof value === "string" &&
    THEME_PREFERENCES.includes(value as ThemePreference)
  )
}

export const getStoredThemePreference = (): ThemePreference | null => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(value) ? value : null
  } catch {
    return null
  }
}

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light"
  }

  try {
    return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light"
  } catch {
    return "light"
  }
}

export const resolveThemePreference = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme()
): ResolvedTheme => {
  if (preference === "system") {
    return systemTheme
  }

  return preference
}

export const applyResolvedTheme = (resolvedTheme: ResolvedTheme): void => {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement

  if (resolvedTheme === "dark") {
    root.classList.add(THEME_DARK_CLASS)
  } else {
    root.classList.remove(THEME_DARK_CLASS)
  }

  root.style.colorScheme = resolvedTheme
}

export const persistThemePreference = (
  preference: ThemePreference
): void => {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    return
  }
}

export const getInitialResolvedTheme = (): ResolvedTheme => {
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains(THEME_DARK_CLASS)) {
      return "dark"
    }

    if (document.documentElement.style.colorScheme === "dark") {
      return "dark"
    }

    if (document.documentElement.style.colorScheme === "light") {
      return "light"
    }
  }

  return getSystemTheme()
}
