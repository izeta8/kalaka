import { geoCentroid, geoConicConformal, geoPath } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Link, useNavigate } from "react-router"
import type { MapFeature, MapProperties, WaterFeature } from "./map-data"
import { placeLabels } from "./map-labels"

export interface MapRegion {
  feature: MapFeature
  /** Accessible name and hover label */
  name: string
  /** Where a click goes; null draws the region muted and not clickable */
  href: string | null
  /**
   * Name drawn on the map when it fits (size in screen pixels). Regions are tried in the order they are given.
   * `emphasis` (capitals, herrialdeak) draws it stronger; with `overflow` (emphasis or big towns) the name may
   * stick out of its shape. A name never touches another one.
   */
  label?: { text: string; size: number; emphasis: boolean; overflow: boolean }
}

const WIDTH = 640

/**
 * Official boundaries as SVG. Conformal conic projection centred on the shapes and fitted to the width.
 * Clickable regions are real links (focusable, named, Enter navigates); the others are decoration.
 * Water and names are drawn on top, out of the way of the pointer and of screen readers.
 */
export function RegionMap({
  regions,
  water = [],
  rivers = [],
  label,
}: {
  regions: MapRegion[]
  water?: WaterFeature[]
  rivers?: WaterFeature[]
  label: string
}) {
  const navigate = useNavigate()
  const [active, setActive] = useState<MapRegion | null>(null)
  const pixel = useSvgPixel()

  const { projection, shapes, height } = useMemo(() => {
    const collection: FeatureCollection<Geometry, MapProperties> = {
      type: "FeatureCollection",
      features: regions.map((region) => region.feature),
    }
    const [longitude] = geoCentroid(collection)
    const projection = geoConicConformal().parallels([42.5, 43.5]).rotate([-longitude, 0]).fitWidth(WIDTH, collection)
    const path = geoPath(projection)
    const [, [, bottom]] = path.bounds(collection)
    return { projection, shapes: regions.map((region) => ({ region, d: path(region.feature) ?? "" })), height: Math.ceil(bottom) }
  }, [regions])

  const waterShapes = useMemo(() => {
    const path = geoPath(projection)
    return {
      surfaces: water.map((surface, index) => ({ key: index, d: path(surface) ?? "" })),
      lines: rivers.map((river, index) => ({ key: index, d: path(river) ?? "", estuary: river.properties.kind === "estuary" })),
    }
  }, [projection, water, rivers])

  const labels = useMemo(() => placeLabels(regions, projection, pixel.size), [regions, projection, pixel.size])

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
        ref={pixel.ref}
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
        <g aria-hidden className="pointer-events-none" data-testid="map-water">
          {waterShapes.surfaces.map(({ key, d }) => (
            <path key={key} d={d} className="fill-map-water" />
          ))}
          {waterShapes.lines.map(({ key, d, estuary }) => (
            <path
              key={key}
              d={d}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={estuary ? "fill-none stroke-map-water stroke-[3]" : "fill-none stroke-map-water stroke-1"}
            />
          ))}
        </g>
        {activeShape && (
          // Drawn after the water so its outline is never hidden.
          <path
            d={activeShape.d}
            aria-hidden
            vectorEffect="non-scaling-stroke"
            className="pointer-events-none fill-none stroke-foreground stroke-2"
          />
        )}
        <g aria-hidden className="pointer-events-none select-none" data-testid="map-labels">
          {labels.map((placed) => (
            <text
              key={placed.key}
              x={placed.x}
              y={placed.y}
              fontSize={placed.fontSize}
              textAnchor="middle"
              dominantBaseline="central"
              strokeWidth={3 * pixel.size}
              strokeLinejoin="round"
              paintOrder="stroke"
              className={labelClass(placed.emphasis, placed.muted)}
            >
              {placed.text}
            </text>
          ))}
        </g>
      </svg>
      <figcaption aria-hidden className="min-h-5 text-center text-sm text-muted-foreground">
        {active?.name}
      </figcaption>
    </figure>
  )
}

/** Small, soft names with a halo of the page colour: readable over borders and rivers without shouting. */
function labelClass(emphasis: boolean, muted: boolean) {
  if (emphasis) return "fill-foreground stroke-background/80 font-semibold"
  return muted ? "fill-muted-foreground stroke-background/80 font-medium" : "fill-foreground/80 stroke-background/80 font-medium"
}

/**
 * Size of one screen pixel in SVG units. The map scales with its container, so names keep the same size on
 * screen at any width (and fewer fit on a phone). Without layout (tests), one unit is one pixel.
 */
function useSvgPixel() {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState(1)
  useEffect(() => {
    const svg = ref.current
    if (!svg || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width
      if (width) setSize(Math.round(((WIDTH + 4) / width) * 100) / 100)
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])
  return { ref, size }
}
