import { readStorage, writeStorage } from "@/lib/storage"

export const THEMES = ["system", "light", "dark"] as const
export type Theme = (typeof THEMES)[number]

// Must match the inline script in index.html.
const STORAGE_KEY = "kalaka.theme"

export function readStoredTheme(): Theme {
  const stored = readStorage(STORAGE_KEY)
  return THEMES.find((theme) => theme === stored) ?? "system"
}

export function storeTheme(theme: Theme): void {
  writeStorage(STORAGE_KEY, theme)
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
}
