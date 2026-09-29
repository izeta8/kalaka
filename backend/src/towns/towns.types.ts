import type { Province } from "../provinces/provinces.types.ts"

export interface Town {
  id: number
  slug: string
  name: string
  province: Province
  room_id: number
  created_at: Date
  updated_at: Date
}

export interface TownDB {
  id: number
  slug: string
  name: string
  province_id: number
  room_id: number
  created_at: Date
  updated_at: Date
}

export type TownBasic = Pick<Town, "slug" | "name">
