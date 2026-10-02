import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { useProvinces, useTowns } from "@/api/queries"
import { NotFoundState } from "@/components/feedback/not-found-state"
import { RoomView } from "@/features/room/room-view"
import { BackLink, PageError, PageLoading } from "./page-parts"

export function TownPage() {
  const { t } = useTranslation()
  const { provinceSlug = "", townSlug = "" } = useParams()
  const provinces = useProvinces()
  const towns = useTowns(provinceSlug)

  if (towns.isError) return <PageError error={towns.error} onRetry={() => void towns.refetch()} />
  if (towns.isPending || provinces.isPending) return <PageLoading />

  // There is no endpoint for a single town: its name comes from the province's town list.
  const town = towns.data.find((candidate) => candidate.slug === townSlug)
  if (!town) return <NotFoundState />
  const provinceName = provinces.data?.find((province) => province.slug === provinceSlug)?.name ?? provinceSlug

  return (
    <div className="flex flex-col gap-6">
      <title>{`${town.name} · ${t("app.name")}`}</title>
      <div className="flex flex-col gap-1">
        <BackLink to={`/${provinceSlug}`}>{provinceName}</BackLink>
        <h1 className="text-3xl font-semibold">{town.name}</h1>
      </div>
      <RoomView key={`${provinceSlug}/${townSlug}`} room={{ provinceSlug, townSlug }} />
    </div>
  )
}
