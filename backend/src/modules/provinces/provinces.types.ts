export interface ProvinceRow {
  id: number
  slug: string
  name: string
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type ProvinceBasic = Pick<ProvinceRow, "slug" | "name">
