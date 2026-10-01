export interface UserRow {
  id: number
  publicId: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  email: string
  emailVerifiedAt: Date
  townId: number
  createdAt: Date
  updatedAt: Date
}

export type UserPublic = Pick<UserRow, "publicId" | "username" | "displayName" | "bio" | "avatarUrl">
