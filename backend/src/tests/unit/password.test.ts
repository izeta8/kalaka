import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import { hashPassword, verifyPassword } from "../../modules/auth/password.ts"

const PASSWORD = "Gq)t9[gI05"

describe("hashPassword", () => {
  it("returns a string in the $scrypt$params$salt$hash format", async () => {
    const generatedHash = await hashPassword(PASSWORD)

    // "$scrypt$params$salt$hash".split("$") -> ["", "scrypt", params, salt, hash]
    const parts = generatedHash.split("$")

    // Validate the array length before accessing the elements.
    assert.equal(parts.length, 5, `expected 5 "$"-separated parts, got ${parts.length}`)
    const salt = Buffer.from(parts[3], "base64")
    const hash = Buffer.from(parts[4], "base64")

    assert.equal(parts[0], "", `the first element must be empty string (the hash must start with $)`)
    assert.equal(parts[1], "scrypt", `the second element must be 'scrypt'`)
    assert.equal(parts[2], "N=131072,r=8,p=1", `incorrect parameters`)
    assert.equal(salt.length, 16, `incorrect salt length`)
    assert.equal(hash.length, 32, `incorrect hash length`)
  })

  it("generates a different hash for the same password", async () => {
    const generatedHash1 = await hashPassword(PASSWORD)
    const generatedHash2 = await hashPassword(PASSWORD)
    assert.notEqual(generatedHash1, generatedHash2)
  })
})

describe("verifyPassword", () => {
  let hash: string

  before(async () => {
    hash = await hashPassword(PASSWORD)
  })

  it("returns true for the correct password", async () => {
    const isValid = await verifyPassword(PASSWORD, hash)
    assert.equal(isValid, true)
  })

  it("returns false for a wrong password", async () => {
    const incorrectPassword = PASSWORD + "_incorrect"
    const isValid = await verifyPassword(incorrectPassword, hash)
    assert.equal(isValid, false)
  })

  it("throws on a malformed stored hash", async () => {
    const malformedHash = "$malformed$hash"

    await assert.rejects(verifyPassword(PASSWORD, malformedHash), {
      message: 'malformed password hash: expected 5 "$"-separated parts, got 3',
    })
  })
})
