import { query, withTransaction } from "../../shared/database/query.ts"
import type { RetiredUsernamesRow, UserRow } from "../users/users.types.ts"
import type { PasswordRegistrationInsert } from "./auth.types.ts"

export const insertUserWithPassword = async ({
  publicId,
  username,
  displayName,
  email,
  passwordHash,
}: PasswordRegistrationInsert): Promise<UserRow> => {
  const insertedUser = await withTransaction(async (client) => {
    // First we insert the user in users table.
    const insertUserQuery = `
        INSERT INTO users(public_id, username, display_name, email)
        VALUES ($1, $2, $3, $4) 
        RETURNING *
        `
    const insertedUserArray = await query<UserRow>(insertUserQuery, [publicId, username, displayName, email], client)
    if (insertedUserArray.length === 0) {
      throw new Error(`there was an error inserting the user (publicId: ${publicId}, username: ${username}, displayName: ${displayName})`)
    }
    const insertedUser = insertedUserArray[0]

    // Then we insert that users authentication data in auth_accounts table.
    const provider = "password"
    const insertAuthQuery = `
        INSERT INTO auth_accounts(user_id, provider, password_hash)
        VALUES ($1, $2, $3)
      `
    await query(insertAuthQuery, [insertedUser.id, provider, passwordHash], client)

    return insertedUser
  })

  return insertedUser
}

export const findRetiredUsername = async (username: string): Promise<RetiredUsernamesRow | null> => {
  const selectQuery = `
    SELECT * 
    FROM retired_usernames
    WHERE username = $1
  `
  const retiredUserArray = await query<RetiredUsernamesRow>(selectQuery, [username])
  return retiredUserArray.length > 0 ? retiredUserArray[0] : null
}
