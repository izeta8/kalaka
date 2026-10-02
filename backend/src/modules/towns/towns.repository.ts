import * as database from "../../shared/database/query.ts"
import type { TownRow } from "./towns.types.ts"

export const findTownsOfProvince = async (provinceId: number): Promise<TownRow[]> => {
  const queryString = `
        SELECT *
        FROM towns
        WHERE province_id = $1
        ORDER BY slug`

  return await database.query<TownRow>(queryString, [provinceId])
}

// A town slug is only unique inside its province (towns_unique_slug_plus_province_id)
export const findTownBySlugs = async (provinceSlug: string, townSlug: string): Promise<TownRow | null> => {
  const queryString = `
        SELECT towns.*
        FROM towns
        JOIN provinces ON provinces.id = towns.province_id
        WHERE provinces.slug = $1 AND towns.slug = $2`

  const townRows = await database.query<TownRow>(queryString, [provinceSlug, townSlug])
  return townRows.length > 0 ? townRows[0] : null
}
