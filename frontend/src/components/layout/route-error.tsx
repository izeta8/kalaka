import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "./site-header"

/** Last resort when a screen throws while rendering. */
export function RouteError() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-160 flex-col items-start gap-3 px-4 py-8">
        <h1 className="text-2xl font-semibold">{t("crash.title")}</h1>
        <p className="text-muted-foreground">{t("crash.description")}</p>
        <Button onClick={() => window.location.reload()}>{t("crash.reload")}</Button>
      </main>
    </div>
  )
}
