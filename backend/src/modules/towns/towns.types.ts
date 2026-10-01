export interface TownRow {
  id: number
  slug: string
  name: string
  provinceId: number
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type TownPublic = Pick<TownRow, "slug" | "name">
