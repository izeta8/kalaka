export interface ProvinceRow {
  id: number
  slug: string
  name: string
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type ProvincePublic = Pick<ProvinceRow, "slug" | "name">
