import type { UserPublic, UserRow } from "./users.types.ts"

export const toPublicUser = ({ publicId, username, displayName, bio, avatarUrl }: UserRow): UserPublic => {
  return { publicId, username, displayName, bio, avatarUrl }
}
