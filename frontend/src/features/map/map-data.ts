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
  /** Land shared by several municipalities (parzonerías, facerías…): drawn, never a town */
  shared?: boolean
}

export type MapFeature = Feature<Geometry, MapProperties>

const loaders = import.meta.glob<Topology>("/src/data/maps/*.topo.json", { import: "default" })

/** "euskal-herria" for the 7 herrialdeak, or a province slug for its municipalities. Null when there is no map for it. */
export async function loadMap(name: string): Promise<MapFeature[] | null> {
  const load = loaders[`/src/data/maps/${name}.topo.json`]
  if (!load) return null
  const topology = await load()
  const [object] = Object.values(topology.objects) as GeometryCollection<MapProperties>[]
  return (feature(topology, object) as FeatureCollection<Geometry, MapProperties>).features
}

export function useMapFeatures(name: string) {
  return useQuery({ queryKey: ["map", name], queryFn: () => loadMap(name), staleTime: Infinity })
}
