import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { THEMES } from "@/theme/theme-storage"
import { useTheme } from "@/theme/use-theme"

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const

/** One button that cycles system → light → dark. */
export function ThemeSwitch() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const Icon = ICONS[theme]
  const label = t("theme.label", { mode: t(`theme.${theme}`) })
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]

  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={() => setTheme(next)}>
      <Icon aria-hidden />
    </Button>
  )
}
