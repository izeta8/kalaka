import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { after, describe, it } from "node:test"
import { RegisterRequestSchema } from "../../modules/auth/auth.schemas.ts"
import { register } from "../../modules/auth/auth.service.ts"
import type { RegisterRequestData } from "../../modules/auth/auth.types.ts"
import { verifyPassword } from "../../modules/auth/password.ts"
import { pool } from "../../shared/database/database.ts"
import { query } from "../../shared/database/query.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

// Unique values on every call, so tests don't collide with each other or with a previous run.
const newRegistration = (): RegisterRequestData => {
  const id = randomBytes(4).toString("hex")
  return {
    username: `user_${id}`,
    email: `${id}@example.com`,
    password: "correct horse",
  }
}

describe("register", () => {
  it("creates the user and returns its public data", async () => {
    const data = newRegistration()

    const result = await register(data)

    assert.ok(result.ok)
    assert.equal(result.value.username, data.username)
    assert.equal(result.value.displayName, data.username)
    // Public data only: no email, no internal id.
    assert.equal("email" in result.value, false)
    assert.equal("id" in result.value, false)
  })

  // Lowercasing is the schema's job, so this goes through it like the route will.
  it("lowercased username collides: 'Izeta' after 'izeta' is username-taken", async () => {
    const data = newRegistration()
    await register(data)

    const upper = RegisterRequestSchema.parse({ ...newRegistration(), username: data.username.toUpperCase() })

    assert.deepStrictEqual(await register(upper), { ok: false, error: "username-taken" })
  })

  it("returns username-taken for an existing username", async () => {
    const data = newRegistration()
    await register(data)

    const result = await register({ ...newRegistration(), username: data.username })

    assert.deepStrictEqual(result, { ok: false, error: "username-taken" })
  })

  it("returns username-taken for a retired username", async () => {
    const data = newRegistration()
    await query("INSERT INTO retired_usernames (username) VALUES ($1)", [data.username])

    assert.deepStrictEqual(await register(data), { ok: false, error: "username-taken" })
  })

  it("returns email-taken for an existing email", async () => {
    const data = newRegistration()
    await register(data)

    const result = await register({ ...newRegistration(), email: data.email })

    assert.deepStrictEqual(result, { ok: false, error: "email-taken" })
  })

  it("stores a password hash that verifyPassword accepts", async () => {
    const data = newRegistration()
    await register(data)

    const [account] = await query<{ passwordHash: string }>(
      "SELECT a.password_hash FROM auth_accounts a JOIN users u ON u.id = a.user_id WHERE u.username = $1",
      [data.username],
    )

    assert.equal(await verifyPassword(data.password, account.passwordHash), true)
    assert.equal(await verifyPassword("wrong password", account.passwordHash), false)
  })
})
