import { ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { useProvinces } from "@/api/queries"
import { ErrorState } from "@/components/feedback/error-state"
import { LoadingList } from "@/components/feedback/loading-list"
import { HerrialdeakMap } from "@/features/map/lazy-maps"
import { errorMessageKey } from "@/lib/error-message"

export function ProvincesPage() {
  const { t } = useTranslation()
  const provinces = useProvinces()

  return (
    <section className="flex flex-col gap-4">
      <title>{t("app.name")}</title>
      <div>
        <h1 className="text-3xl font-semibold">{t("provinces.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("provinces.intro")}</p>
      </div>

      {provinces.isPending ? (
        <LoadingList rows={7} />
      ) : provinces.isError ? (
        <ErrorState message={t(errorMessageKey(provinces.error, "load"))} onRetry={() => void provinces.refetch()} />
      ) : provinces.data.length === 0 ? (
        <p className="text-muted-foreground">{t("provinces.empty")}</p>
      ) : (
        <>
          <HerrialdeakMap provinces={provinces.data} />
          <ul aria-label={t("provinces.title")} className="grid gap-2 sm:grid-cols-2">
            {provinces.data.map((province) => (
              <li key={province.slug}>
                <Link
                  to={`/${province.slug}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 font-medium shadow-xs transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {province.name}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
