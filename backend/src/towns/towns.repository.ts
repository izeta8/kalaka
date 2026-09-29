import * as database from "../database/query.ts"
import type { TownBasic } from "./towns.types.ts"

export const getTowns = async (provinceSlug: string): Promise<TownBasic[]> => {
  const queryString = `
      SELECT t.slug, t.name
      FROM provinces p
      LEFT JOIN towns t
      ON p.id = t.province_id
      WHERE p.slug = $1::text
      ORDER BY t.slug`

  return await database.query<TownBasic>(queryString, [provinceSlug])
}
