import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function NotFoundState() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-start gap-3 py-8">
      <title>{`${t("notFound.title")} · ${t("app.name")}`}</title>
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-muted-foreground">{t("notFound.description")}</p>
      <Button asChild>
        <Link to="/">{t("app.goHome")}</Link>
      </Button>
    </section>
  )
}
