export interface UserRow {
  id: number
  publicId: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  email: string
  emailVerifiedAt: Date | null
  townId: number | null
  createdAt: Date
  updatedAt: Date
}

export type UserPublic = Pick<UserRow, "publicId" | "username" | "displayName" | "bio" | "avatarUrl">

export interface RetiredUsernamesRow {
  username: string
  createdAt: Date
}
