import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { after, describe, it } from "node:test"
import { findPasswordAccountByUsername, insertUserWithPassword } from "../../modules/auth/auth.repository.ts"
import type { AuthAccountsRow, PasswordRegistrationInsert } from "../../modules/auth/auth.types.ts"
import { pool } from "../../shared/database/database.ts"
import { query } from "../../shared/database/query.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

// Unique values on every call, so tests don't collide with each other or with a previous run.
const newUser = (): PasswordRegistrationInsert => {
  const id = randomBytes(4).toString("hex") // 8 chars of [a-f0-9]
  return {
    publicId: id,
    username: `user_${id}`,
    displayName: "Test user",
    email: `${id}@example.com`,
    passwordHash: "$scrypt$N=131072,r=8,p=1$c2FsdA==$aGFzaA==", // valid format, no need to really hash
  }
}

const countUsersWithEmail = async (email: string) => {
  const rows = await query("SELECT id FROM users WHERE email = $1", [email])
  return rows.length
}

describe("insertUserWithPassword", () => {
  it("creates the user and its password account", async () => {
    const data = newUser()

    const user = await insertUserWithPassword(data)

    assert.equal(user.username, data.username)
    assert.equal(user.email, data.email)
    const accounts = await query<AuthAccountsRow>("SELECT * FROM auth_accounts WHERE user_id = $1", [user.id])
    assert.equal(accounts.length, 1)
    assert.equal(accounts[0].provider, "password")
    assert.equal(accounts[0].passwordHash, data.passwordHash)
  })

  it("fails with 23505 on a duplicate username and stores nothing", async () => {
    const existing = newUser()
    await insertUserWithPassword(existing)
    const duplicate = { ...newUser(), username: existing.username }

    await assert.rejects(insertUserWithPassword(duplicate), { code: "23505", constraint: "users_username_key" })
    assert.equal(await countUsersWithEmail(duplicate.email), 0)
  })

  it("fails with 23505 on a duplicate email", async () => {
    const existing = newUser()
    await insertUserWithPassword(existing)

    await assert.rejects(insertUserWithPassword({ ...newUser(), email: existing.email }), {
      code: "23505",
      constraint: "users_email_key",
    })
  })

  // The user insert succeeds and the account insert fails: the transaction must undo the user.
  it("rolls back the user when the account insert fails (invalid password_hash, 23514)", async () => {
    const data = { ...newUser(), passwordHash: "not-a-hash" }

    await assert.rejects(insertUserWithPassword(data), {
      code: "23514",
      constraint: "auths_accounts_password_hash_format",
    })
    assert.equal(await countUsersWithEmail(data.email), 0)
  })
})

describe("findPasswordAccountByUsername", () => {
  it("returns the user with its password hash", async () => {
    const data = newUser()
    const inserted = await insertUserWithPassword(data)

    const found = await findPasswordAccountByUsername(data.username)

    assert.ok(found)
    assert.equal(found.id, inserted.id)
    assert.equal(found.username, data.username)
    assert.equal(found.passwordHash, data.passwordHash)
  })

  it("returns null for an unknown username", async () => {
    assert.equal(await findPasswordAccountByUsername(newUser().username), null)
  })
})
