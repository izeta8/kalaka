import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Province } from "@/api/types"
import { Skeleton } from "@/components/ui/skeleton"
import { useMapFeatures } from "./map-data"
import { RegionMap, type MapRegion } from "./region-map"

/** The 7 herrialdeak. A region is a link when the API has that province. */
export function HerrialdeakMap({ provinces }: { provinces: Province[] }) {
  const { t } = useTranslation()
  const map = useMapFeatures("euskal-herria")

  const regions = useMemo<MapRegion[]>(
    () =>
      (map.data ?? []).map((feature) => {
        const province = provinces.find((candidate) => candidate.slug === feature.properties.code)
        return { feature, name: province?.name ?? feature.properties.name, href: province ? `/${province.slug}` : null }
      }),
    [map.data, provinces],
  )

  if (map.isPending) return <Skeleton className="aspect-[4/3] w-full" />
  if (regions.length === 0) return null
  return <RegionMap regions={regions} label={t("map.herrialdeak")} />
}
