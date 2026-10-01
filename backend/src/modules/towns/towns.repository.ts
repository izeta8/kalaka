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

export const findTown = async (slug: string): Promise<TownRow[]> => {
  const queryString = `
        SELECT *
        FROM towns
        WHERE slug = $1`

  return await database.query<TownRow>(queryString, [slug])
}
