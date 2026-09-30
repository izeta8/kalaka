export interface TownRow {
  id: number
  slug: string
  name: string
  provinceId: number
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type TownBasic = Pick<TownRow, "slug" | "name">
