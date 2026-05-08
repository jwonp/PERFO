"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import {
  getInitialResolvedTheme,
  getStoredThemePreference,
  getSystemTheme,
  persistThemePreference,
  resolveThemePreference,
  applyResolvedTheme,
} from "@/lib/theme/theme"
import { THEME_MEDIA_QUERY } from "@/lib/theme/theme.constants"
import type {
  ThemeContextValue,
  ThemeProviderProps,
} from "@/components/providers/theme-provider.types"
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme.types"

const ThemeContext = createContext<ThemeContextValue | null>(null)

const getInitialThemePreference = (): ThemePreference => {
  return getStoredThemePreference() ?? "system"
}

const getInitialThemeState = () => {
  const initialPreference = getInitialThemePreference()
  const initialResolvedTheme = resolveThemePreference(
    initialPreference,
    getInitialResolvedTheme()
  )

  return {
    preference: initialPreference,
    resolvedTheme: initialResolvedTheme,
  }
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [{ preference, resolvedTheme }, setThemeState] = useState(
    getInitialThemeState
  )

  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined") {
      return
    }

    try {
      const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY)
      const handleChange = (event: MediaQueryListEvent) => {
        const nextResolvedTheme = event.matches ? "dark" : "light"
        setThemeState((currentState) => ({
          ...currentState,
          resolvedTheme: nextResolvedTheme,
        }))
        applyResolvedTheme(nextResolvedTheme)
      }

      mediaQuery.addEventListener("change", handleChange)

      return () => {
        mediaQuery.removeEventListener("change", handleChange)
      }
    } catch {
      return
    }
  }, [preference])

  const setPreference = (nextPreference: ThemePreference) => {
    const nextResolvedTheme = resolveThemePreference(
      nextPreference,
      getSystemTheme()
    )

    setThemeState({
      preference: nextPreference,
      resolvedTheme: nextResolvedTheme,
    })
    persistThemePreference(nextPreference)
  }

  return (
    <ThemeContext.Provider
      value={{ preference, resolvedTheme, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

export default ThemeProvider
export { useTheme }
