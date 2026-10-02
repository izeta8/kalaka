import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Town } from "@/api/types"
import { Skeleton } from "@/components/ui/skeleton"
import { townMunicipalities } from "@/data/town-table"
import { useMapFeatures } from "./map-data"
import { RegionMap, type MapRegion } from "./region-map"

/**
 * A province's municipalities. A municipality is a link when the API has a town for it;
 * the rest are drawn muted so the shape stays complete.
 */
export function TownsMap({ provinceSlug, provinceName, towns }: { provinceSlug: string; provinceName: string; towns: Town[] }) {
  const { t } = useTranslation()
  const map = useMapFeatures(provinceSlug)

  const regions = useMemo<MapRegion[]>(() => {
    const slugByCode = new Map(townMunicipalities(provinceSlug).map((entry) => [entry.code, entry.slug]))
    return (map.data ?? []).map((feature) => {
      const slug = feature.properties.shared ? undefined : slugByCode.get(feature.properties.code)
      const town = slug && towns.find((candidate) => candidate.slug === slug)
      return town
        ? { feature, name: town.name, href: `/${provinceSlug}/${town.slug}` }
        : { feature, name: feature.properties.name, href: null }
    })
  }, [map.data, provinceSlug, towns])

  if (map.isPending) return <Skeleton className="aspect-[4/3] w-full" />
  if (regions.length === 0) return null
  return <RegionMap regions={regions} label={t("map.towns", { name: provinceName })} />
}
