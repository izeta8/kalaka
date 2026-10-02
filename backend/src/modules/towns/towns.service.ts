import * as provincesRepository from "../provinces/provinces.repository.ts"
import * as townsRepository from "./towns.repository.ts"
import type { TownPublic } from "./towns.types.ts"

export const getTownsByProvinceSlug = async (provinceSlug: string): Promise<TownPublic[] | null> => {
  // Check if province existes
  const province = await provincesRepository.findProvinceBySlug(provinceSlug)
  if (province === null) {
    return null
  }

  const towns = await townsRepository.findTownsOfProvince(province.id)
  const townsBasic: TownPublic[] = towns.map(({ slug, name }) => ({ slug, name }))

  return townsBasic
}
