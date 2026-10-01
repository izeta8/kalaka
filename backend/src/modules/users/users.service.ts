import { findUserById } from "./users.repository.ts"
import type { UserPublic, UserRow } from "./users.types.ts"

export const getUserById = async (id: number): Promise<UserRow | null> => {
  const user = await findUserById(id)

  // If the user doesn't exist return null
  if (user.length === 0) {
    return null
  }

  return user[0]
}

export const privateToPublicUser = ({ publicId, username, displayName, bio, avatarUrl }: UserRow): UserPublic => {
  return { publicId, username, displayName, bio, avatarUrl }
}
