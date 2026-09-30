import * as database from "../../shared/database/query.ts"
import type { ProvinceBasic, ProvinceRow } from "./provinces.types.ts"

export const findProvinces = async (): Promise<ProvinceBasic[]> => {
  const query = `
    SELECT slug, name
    FROM provinces
    ORDER BY id`

  return await database.query<ProvinceBasic>(query)
}

export const findProvinceBySlug = async (slug: string): Promise<ProvinceRow | null> => {
  const query = `
    SELECT *
    FROM provinces
    WHERE slug = $1`

  const province = await database.query<ProvinceRow>(query, [slug])
  return province.length > 0 ? province[0] : null
}
