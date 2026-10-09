import type z from "zod"
import type { UserRow } from "../users/users.types.ts"
import type { RegisterRequestSchema } from "./auth.schemas.ts"

export interface AuthAccountsRow {
  id: number
  userId: number
  provider: "password" | "google" // For now only password is enabled
  providerUserId: string | null
  passwordHash: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PasswordRegistrationInsert {
  publicId: string
  username: string
  displayName: string
  email: string
  passwordHash: string
}

export type RegisterRequestData = z.output<typeof RegisterRequestSchema>

export interface UserWithPasswordHash extends UserRow {
  passwordHash: string
}
