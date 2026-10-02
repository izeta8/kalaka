import { useQuery } from "@tanstack/react-query"
import type { Feature, FeatureCollection, Geometry } from "geojson"
import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"

// Maps built by scripts/build-maps.mjs. Each file is its own chunk, loaded when a screen needs it.

export interface MapProperties {
  /** Official code (INE / INSEE) for municipalities, province slug for herrialdeak */
  code: string
  /** Official name */
  name: string
  /** Basque name (Wikidata), shown for municipalities that are not towns of the API */
  basqueName?: string | null
  /** Latest population (Wikidata): bigger places get their label first */
  population?: number
  /** Capital of its herrialde: labelled before anything else */
  capital?: boolean
  /** [longitude, latitude] of a point well inside the shape, where its name is anchored */
  label?: [number, number]
  /** Land shared by several municipalities (parzonerías, facerías…): drawn, never a town */
  shared?: boolean
}

export interface WaterProperties {
  /** Surfaces: "river" (wide rivers) or "lake" (reservoirs, lakes). Lines: "river" or "estuary" (a ría) */
  kind: "river" | "lake" | "estuary"
  name?: string
}

export type MapFeature = Feature<Geometry, MapProperties>
export type WaterFeature = Feature<Geometry, WaterProperties>

export interface MapLayers {
  /** Municipalities of a province, or the 7 herrialdeak */
  regions: MapFeature[]
  /** Water surfaces inside the map */
  water: WaterFeature[]
  /** Rivers and rías inside the map, as lines */
  rivers: WaterFeature[]
}

const loaders = import.meta.glob<Topology>("/src/data/maps/*.topo.json", { import: "default" })

/** "euskal-herria" for the 7 herrialdeak, or a province slug for its municipalities. Null when there is no map for it. */
export async function loadMap(name: string): Promise<MapLayers | null> {
  const load = loaders[`/src/data/maps/${name}.topo.json`]
  if (!load) return null
  const topology = await load()
  const objects = topology.objects as Record<string, GeometryCollection | undefined>
  const layer = <P>(object: GeometryCollection | undefined) =>
    object ? (feature(topology, object) as FeatureCollection<Geometry, P>).features : []
  return {
    regions: layer<MapProperties>(objects.municipalities ?? objects.herrialdeak),
    water: layer<WaterProperties>(objects.water),
    rivers: layer<WaterProperties>(objects.rivers),
  }
}

export function useMapLayers(name: string) {
  return useQuery({ queryKey: ["map", name], queryFn: () => loadMap(name), staleTime: Infinity })
}
