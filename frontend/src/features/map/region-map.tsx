import { geoCentroid, geoConicConformal, geoPath } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"
import { useMemo, useState, type KeyboardEvent } from "react"
import { Link, useNavigate } from "react-router"
import type { MapFeature, MapProperties } from "./map-data"

export interface MapRegion {
  feature: MapFeature
  /** Accessible name and hover label */
  name: string
  /** Where a click goes; null draws the region muted and not clickable */
  href: string | null
}

const WIDTH = 640

/**
 * Official boundaries as SVG. Conformal conic projection centred on the shapes and fitted to the width.
 * Clickable regions are real links (focusable, named, Enter navigates); the others are decoration.
 */
export function RegionMap({ regions, label }: { regions: MapRegion[]; label: string }) {
  const navigate = useNavigate()
  const [active, setActive] = useState<MapRegion | null>(null)

  const { shapes, height } = useMemo(() => {
    const collection: FeatureCollection<Geometry, MapProperties> = {
      type: "FeatureCollection",
      features: regions.map((region) => region.feature),
    }
    const [longitude] = geoCentroid(collection)
    const projection = geoConicConformal().parallels([42.5, 43.5]).rotate([-longitude, 0]).fitWidth(WIDTH, collection)
    const path = geoPath(projection)
    const [, [, bottom]] = path.bounds(collection)
    return { shapes: regions.map((region) => ({ region, d: path(region.feature) ?? "" })), height: Math.ceil(bottom) }
  }, [regions])

  const activeShape = active && shapes.find((shape) => shape.region === active)

  function onKeyDown(event: KeyboardEvent, href: string) {
    // SVG links do not activate with Enter in every browser: do it here, once.
    if (event.key !== "Enter") return
    event.preventDefault()
    void navigate(href)
  }

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`-2 -2 ${WIDTH + 4} ${height + 4}`}
        role="group"
        aria-label={label}
        className="h-auto w-full"
        onMouseLeave={() => setActive(null)}
      >
        {shapes.map(({ region, d }) =>
          region.href ? (
            <Link
              key={region.feature.properties.code}
              to={region.href}
              aria-label={region.name}
              className="group outline-none"
              onKeyDown={(event) => onKeyDown(event, region.href!)}
              onMouseEnter={() => setActive(region)}
              onFocus={() => setActive(region)}
              onBlur={() => setActive(null)}
            >
              <path
                d={d}
                vectorEffect="non-scaling-stroke"
                className="fill-primary/30 stroke-card stroke-1 transition-colors group-hover:fill-primary/70 group-focus-visible:fill-primary/70"
              />
            </Link>
          ) : (
            <path
              key={region.feature.properties.code}
              d={d}
              aria-hidden
              vectorEffect="non-scaling-stroke"
              className="fill-muted stroke-card stroke-1"
              onMouseEnter={() => setActive(region)}
            >
              <title>{region.name}</title>
            </path>
          ),
        )}
        {activeShape && (
          // Drawn last so its outline is not hidden under the neighbours.
          <path
            d={activeShape.d}
            aria-hidden
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none fill-none stroke-foreground stroke-2"
          />
        )}
      </svg>
      <figcaption aria-hidden className="min-h-5 text-center text-sm text-muted-foreground">
        {active?.name}
      </figcaption>
    </figure>
  )
}
