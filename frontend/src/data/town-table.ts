import townTable from "./town-municipalities.json"

export interface TownMunicipality {
  slug: string
  name: string
  /** Official municipality code (INE / INSEE) */
  code: string
}

/** Seed towns of a province and their municipality code (town-municipalities.json, made by scripts/build-maps.mjs). */
export function townMunicipalities(provinceSlug: string): TownMunicipality[] {
  const provinces: Record<string, TownMunicipality[] | undefined> = townTable.provinces
  return provinces[provinceSlug] ?? []
}
