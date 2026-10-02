import { useTranslation } from "react-i18next"
import { LANGUAGES } from "@/i18n"
import { cn } from "@/lib/utils"

/** `eu | es` in the header. The choice is remembered and sets <html lang> (see src/i18n). */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t("language.label")} className="flex items-center text-sm">
      {LANGUAGES.map((language, index) => {
        const active = i18n.resolvedLanguage === language.code
        return (
          <span key={language.code} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="text-muted-foreground">
                |
              </span>
            )}
            <button
              type="button"
              lang={language.code}
              aria-label={language.name}
              aria-pressed={active}
              onClick={() => void i18n.changeLanguage(language.code)}
              className={cn(
                "inline-flex min-h-9 min-w-8 items-center justify-center rounded-md px-1 font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {language.code}
            </button>
          </span>
        )
      })}
    </div>
  )
}
