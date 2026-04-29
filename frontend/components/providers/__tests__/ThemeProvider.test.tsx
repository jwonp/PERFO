import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ThemeProvider, { useTheme } from "@/components/providers/ThemeProvider"

type MatchMediaListener = (event: { matches: boolean }) => void

const mediaQueryState = {
  matches: false,
  listeners: new Set<MatchMediaListener>(),
}

const emitSystemTheme = (matches: boolean) => {
  mediaQueryState.matches = matches
  for (const listener of mediaQueryState.listeners) {
    listener({ matches })
  }
}

const ThemeConsumer = () => {
  const { preference, resolvedTheme, setPreference } = useTheme()

  return (
    <div>
      <div>preference:{preference}</div>
      <div>resolved:{resolvedTheme}</div>
      <button type="button" onClick={() => setPreference("dark")}>
        set-dark
      </button>
      <button type="button" onClick={() => setPreference("system")}>
        set-system
      </button>
    </div>
  )
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ""
    document.documentElement.style.colorScheme = ""
    mediaQueryState.matches = false
    mediaQueryState.listeners.clear()

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: mediaQueryState.matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_: string, listener: MatchMediaListener) => {
        mediaQueryState.listeners.add(listener)
      },
      removeEventListener: (_: string, listener: MatchMediaListener) => {
        mediaQueryState.listeners.delete(listener)
      },
      addListener: (listener: MatchMediaListener) => {
        mediaQueryState.listeners.add(listener)
      },
      removeListener: (listener: MatchMediaListener) => {
        mediaQueryState.listeners.delete(listener)
      },
      dispatchEvent: () => true,
    }))
  })

  it("uses the system theme when no saved preference exists", async () => {
    mediaQueryState.matches = true

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("preference:system")).toBeInTheDocument()
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
    })

    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("persists explicit theme changes and updates the html class", async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByRole("button", { name: "set-dark" }))

    expect(window.localStorage.getItem("perfo-theme")).toBe("dark")
    expect(screen.getByText("preference:dark")).toBeInTheDocument()
    expect(screen.getByText("resolved:dark")).toBeInTheDocument()
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("reacts to OS theme changes while the preference is system", async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByRole("button", { name: "set-system" }))
    act(() => {
      emitSystemTheme(true)
    })

    await waitFor(() => {
      expect(screen.getByText("resolved:dark")).toBeInTheDocument()
    })
  })
})
