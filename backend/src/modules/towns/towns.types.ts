import type { Province } from "../provinces/provinces.types.ts"

export interface Town {
  id: number
  slug: string
  name: string
  province: Province
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export interface TownDB {
  id: number
  slug: string
  name: string
  provinceId: number
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type TownBasic = Pick<Town, "slug" | "name">
