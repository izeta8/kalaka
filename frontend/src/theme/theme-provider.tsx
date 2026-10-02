import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ThemeContext } from "./theme-context"
import { applyTheme, readStoredTheme, storeTheme, type Theme } from "./theme-storage"

/** System, light or dark; remembered in localStorage. In "system" it follows OS changes live. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system" || typeof window.matchMedia !== "function") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyTheme("system")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        storeTheme(next)
        setThemeState(next)
      },
    }),
    [theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
