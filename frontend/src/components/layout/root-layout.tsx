import { Outlet, ScrollRestoration } from "react-router"
import { useTranslation } from "react-i18next"
import { SiteHeader } from "./site-header"

export function RootLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-160 flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-160 px-4 pb-6 text-xs text-muted-foreground">{t("footer.attribution")}</footer>
      <ScrollRestoration />
    </div>
  )
}
