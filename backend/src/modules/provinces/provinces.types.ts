export interface Province {
  id: number
  slug: string
  name: string
  roomId: number
  createdAt: Date
  updatedAt: Date
}

export type ProvinceBasic = Pick<Province, "slug" | "name">
