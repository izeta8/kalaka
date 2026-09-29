export interface Town {
  id: number
  slug: string
  name: string
  province_id: number
  room_id: number
  created_at: Date
  updated_at: Date
}

export interface Province {
  id: number
  slug: string
  name: string
  room_id: number
  created_at: Date
  updated_at: Date
}

export * from "./tables.ts"
