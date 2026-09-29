import * as database from "../database/query.ts"
import type { ProvinceBasic } from "./provinces.types.ts"

export const getProvinces = async (): Promise<ProvinceBasic[]> => {
  const query = `
    SELECT slug, name
    FROM provinces
    ORDER BY id`

  return await database.query<ProvinceBasic>(query)
}
