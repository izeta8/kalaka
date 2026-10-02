import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Town } from "@/api/types"
import { Skeleton } from "@/components/ui/skeleton"
import { townMunicipalities } from "@/data/town-table"
import { useMapLayers } from "./map-data"
import { RegionMap, type MapRegion } from "./region-map"

/** Label sizes in screen pixels: the capital a little bigger, every other name small. */
const CAPITAL_LABEL_SIZE = 13
const LABEL_SIZE = 11
/** Towns this big get their name even when it does not fit inside their (often small) municipality. */
const BIG_TOWN_POPULATION = 20_000

/**
 * A province's municipalities. A municipality is a link when the API has a town for it;
 * the rest are drawn muted so the shape stays complete. Names: the town's name when it is a town,
 * otherwise the Basque name; the capital first, then the most populated, only where they fit.
 */
export function TownsMap({ provinceSlug, provinceName, towns }: { provinceSlug: string; provinceName: string; towns: Town[] }) {
  const { t } = useTranslation()
  const map = useMapLayers(provinceSlug)

  const regions = useMemo<MapRegion[]>(() => {
    const slugByCode = new Map(townMunicipalities(provinceSlug).map((entry) => [entry.code, entry.slug]))
    return (map.data?.regions ?? [])
      .map((feature): MapRegion => {
        const { properties } = feature
        const slug = properties.shared ? undefined : slugByCode.get(properties.code)
        const town = slug && towns.find((candidate) => candidate.slug === slug)
        const name = town ? town.name : (properties.basqueName ?? properties.name)
        return {
          feature,
          name,
          href: town ? `/${provinceSlug}/${town.slug}` : null,
          label: properties.shared
            ? undefined
            : {
                text: name,
                size: properties.capital ? CAPITAL_LABEL_SIZE : LABEL_SIZE,
                emphasis: Boolean(properties.capital),
                overflow: Boolean(properties.capital) || (properties.population ?? 0) >= BIG_TOWN_POPULATION,
              },
        }
      })
      .sort(byLabelPriority)
  }, [map.data, provinceSlug, towns])

  if (map.isPending) return <Skeleton className="aspect-[4/3] w-full" />
  if (regions.length === 0) return null
  return <RegionMap regions={regions} water={map.data?.water} rivers={map.data?.rivers} label={t("map.towns", { name: provinceName })} />
}

/** Capitals first, then by population: the order in which names get their place on the map. */
function byLabelPriority(a: MapRegion, b: MapRegion) {
  const capital = Number(Boolean(b.feature.properties.capital)) - Number(Boolean(a.feature.properties.capital))
  return capital || (b.feature.properties.population ?? 0) - (a.feature.properties.population ?? 0)
}
