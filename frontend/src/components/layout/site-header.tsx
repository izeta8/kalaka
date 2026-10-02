import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { LanguageSwitch } from "./language-switch"
import { ThemeSwitch } from "./theme-switch"

export function SiteHeader() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-160 items-center justify-between gap-4 px-4">
        <Link
          to="/"
          className="rounded-sm font-heading text-2xl font-semibold tracking-tight text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {t("app.name")}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}
