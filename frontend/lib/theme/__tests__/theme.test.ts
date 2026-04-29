import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  applyResolvedTheme,
  getStoredThemePreference,
  getSystemTheme,
  resolveThemePreference,
} from "@/lib/theme/theme"

describe("theme utils", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ""
    document.documentElement.style.colorScheme = ""
  })

  it("reads only valid stored theme preferences", () => {
    window.localStorage.setItem("perfo-theme", "dark")
    expect(getStoredThemePreference()).toBe("dark")

    window.localStorage.setItem("perfo-theme", "invalid")
    expect(getStoredThemePreference()).toBeNull()
  })

  it("handles localStorage access errors", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      () => {
        throw new Error("blocked")
      }
    )

    expect(getStoredThemePreference()).toBeNull()
    getItemSpy.mockRestore()
  })

  it("resolves system preference from the OS media query", () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })

    expect(getSystemTheme()).toBe("dark")
    expect(resolveThemePreference("system")).toBe("dark")
    expect(resolveThemePreference("light", "dark")).toBe("light")

    window.matchMedia = originalMatchMedia
  })

  it("applies the resolved theme to the html element", () => {
    applyResolvedTheme("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe("dark")

    applyResolvedTheme("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe("light")
  })
})
