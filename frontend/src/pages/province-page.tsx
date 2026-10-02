import { useId } from "react"
import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { useProvinces, useTowns } from "@/api/queries"
import type { Town } from "@/api/types"
import { TownSearch } from "@/features/map/town-search"
import { TownsMap } from "@/features/map/lazy-maps"
import { RoomView } from "@/features/room/room-view"
import { BackLink, PageError, PageLoading } from "./page-parts"

export function ProvincePage() {
  const { t } = useTranslation()
  const { provinceSlug = "" } = useParams()
  const provinces = useProvinces()
  const towns = useTowns(provinceSlug)

  if (towns.isError) return <PageError error={towns.error} onRetry={() => void towns.refetch()} />
  if (towns.isPending || provinces.isPending) return <PageLoading />

  // The towns call already proved that the province exists; its name comes from the provinces list.
  const name = provinces.data?.find((province) => province.slug === provinceSlug)?.name ?? provinceSlug

  return (
    <div className="flex flex-col gap-6">
      <title>{`${name} · ${t("app.name")}`}</title>
      <div className="flex flex-col gap-1">
        <BackLink to="/">{t("provinces.title")}</BackLink>
        <h1 className="text-3xl font-semibold">{name}</h1>
      </div>
      <Towns provinceSlug={provinceSlug} provinceName={name} towns={towns.data} />
      <RoomView key={provinceSlug} room={{ provinceSlug }} />
    </div>
  )
}

/** Map and searchable list; a skip link lets keyboard users jump over the map's links. */
function Towns({ provinceSlug, provinceName, towns }: { provinceSlug: string; provinceName: string; towns: Town[] }) {
  const { t } = useTranslation()
  const searchId = useId()
  return (
    <div className="flex flex-col gap-3">
      {towns.length > 0 && (
        <a href={`#${searchId}`} className="sr-only rounded-md bg-card px-3 py-2 text-sm text-primary focus:not-sr-only focus:self-start">
          {t("towns.skipToList")}
        </a>
      )}
      <TownsMap provinceSlug={provinceSlug} provinceName={provinceName} towns={towns} />
      {towns.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("towns.empty")}</p>
      ) : (
        <TownSearch id={searchId} provinceSlug={provinceSlug} towns={towns} />
      )}
    </div>
  )
}
