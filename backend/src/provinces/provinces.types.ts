export interface Province {
  id: number
  slug: string
  name: string
  room_id: number
  created_at: Date
  updated_at: Date
}

export type ProvinceBasic = Pick<Province, "slug" | "name">
