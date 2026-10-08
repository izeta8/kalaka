import { customAlphabet } from "nanoid"
import { DatabaseError } from "pg"
import type { Result } from "../../shared/result.ts"
import { toPublicUser } from "../users/users.service.ts"
import type { UserPublic, UserRow } from "../users/users.types.ts"
import { findRetiredUsername, insertUserWithPassword } from "./auth.repository.ts"
import { type PasswordRegistrationInsert, type RegisterRequestData } from "./auth.types.ts"
import { hashPassword } from "./password.ts"

export type RegisterError = "username-taken" | "email-taken"

// How many random publicIds to try before giving up when inserting a user.
// Each collision with an existing publicId uses one attempt.
const MAX_PUBLIC_ID_ATTEMPTS = 4

// PublicIds: 8 random characters of a-z0-9 (users_public_id_format in the database)
const PUBLIC_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"
const PUBLIC_ID_LENGTH = 8
const generateUserPublicId = customAlphabet(PUBLIC_ID_ALPHABET, PUBLIC_ID_LENGTH)

export const register = async ({ username, email, password }: RegisterRequestData): Promise<Result<UserPublic, RegisterError>> => {
  // Retired usernames can't be reused
  const retiredUsername = await findRetiredUsername(username)
  if (retiredUsername !== null) {
    return { ok: false, error: "username-taken" }
  }

  const displayName = username
  const passwordHash = await hashPassword(password)
  try {
    const insertedUser = await createUserWithUniquePublicId({ username, displayName, email, passwordHash })
    return {
      ok: true,
      value: toPublicUser(insertedUser),
    }
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505") {
      if (error.constraint === "users_username_key") {
        return { ok: false, error: "username-taken" }
      }
      if (error.constraint === "users_email_key") {
        return { ok: false, error: "email-taken" }
      }
    }
    throw error
  }
}

const createUserWithUniquePublicId = async ({
  username,
  displayName,
  email,
  passwordHash,
}: Omit<PasswordRegistrationInsert, "publicId">): Promise<UserRow> => {
  // Retries when the randomly generated publicId collides with an existing one. Any other error is not fixed by retrying.
  for (let attempt = 1; attempt <= MAX_PUBLIC_ID_ATTEMPTS; attempt++) {
    const randomPublicId = generateUserPublicId()

    try {
      return await insertUserWithPassword({ publicId: randomPublicId, username, displayName, email, passwordHash })
    } catch (error) {
      const isPublicIdCollision = error instanceof DatabaseError && error.code === "23505" && error.constraint === "users_public_id_key"
      if (!isPublicIdCollision) {
        throw error
      }

      console.warn(`publicId collision (username: ${username}, attempt ${attempt} of ${MAX_PUBLIC_ID_ATTEMPTS})`)
    }
  }

  throw new Error(`could not generate a unique publicId after ${MAX_PUBLIC_ID_ATTEMPTS} attempts`)
}
