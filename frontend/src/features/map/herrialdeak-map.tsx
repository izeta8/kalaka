import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Province } from "@/api/types"
import { Skeleton } from "@/components/ui/skeleton"
import { useMapLayers } from "./map-data"
import { RegionMap, type MapRegion } from "./region-map"

/** Herrialde names, in screen pixels. */
const LABEL_SIZE = 13

/** The 7 herrialdeak, with their names and the main rivers. A region is a link when the API has that province. */
export function HerrialdeakMap({ provinces }: { provinces: Province[] }) {
  const { t } = useTranslation()
  const map = useMapLayers("euskal-herria")

  const regions = useMemo<MapRegion[]>(
    () =>
      (map.data?.regions ?? []).map((feature) => {
        const province = provinces.find((candidate) => candidate.slug === feature.properties.code)
        const name = province?.name ?? feature.properties.name
        return {
          feature,
          name,
          href: province ? `/${province.slug}` : null,
          label: { text: name, size: LABEL_SIZE, emphasis: true, overflow: true },
        }
      }),
    [map.data, provinces],
  )

  if (map.isPending) return <Skeleton className="aspect-[4/3] w-full" />
  if (regions.length === 0) return null
  return <RegionMap regions={regions} water={map.data?.water} rivers={map.data?.rivers} label={t("map.herrialdeak")} />
}
