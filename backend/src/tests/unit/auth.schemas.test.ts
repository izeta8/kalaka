// auth.schemas.test.ts
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LoginRequestSchema, normalizePassword, RegisterRequestSchema } from "../../modules/auth/auth.schemas.ts"

describe("normalizePassword", () => {
  it("composes decomposed characters (NFKC)", () => {
    const nfd = "é" // 'e' + combining accent
    const nfc = "é" // precomposed 'é'

    assert.notEqual(nfd, nfc)
    assert.equal(normalizePassword(nfd), nfc)
  })

  it("folds compatibility characters (NFKC)", () => {
    assert.equal(normalizePassword("ＡＢＣ"), "ABC") // full-width 'ＡＢＣ'
  })

  it("trims both start and end whitespace, keeps inner spaces", () => {
    assert.equal(normalizePassword("  a b c \n\t"), "a b c")
  })
})

describe("RegisterRequestSchema", () => {
  const valid = {
    username: "izeta",
    email: "izeta@example.com",
    password: "correct horse",
  }

  it("accepts a valid request", () => {
    assert.equal(RegisterRequestSchema.safeParse(valid).success, true)
  })

  it("rejects unknown keys (strict)", () => {
    assert.equal(RegisterRequestSchema.safeParse({ ...valid, role: "admin" }).success, false)
  })

  it("requires an email", () => {
    const { email: _, ...withoutEmail } = valid
    assert.equal(RegisterRequestSchema.safeParse(withoutEmail).success, false)
  })

  it("trims and lowercases the email", () => {
    const result = RegisterRequestSchema.parse({ ...valid, email: "  Izeta@Example.COM " })
    assert.equal(result.email, "izeta@example.com")
  })

  it("rejects invalid emails", () => {
    for (const email of ["", "izeta", "izeta@", "@example.com"]) {
      assert.equal(RegisterRequestSchema.safeParse({ ...valid, email }).success, false, email)
    }
  })

  it("lowercases the username", () => {
    assert.equal(RegisterRequestSchema.parse({ ...valid, username: "Izeta" }).username, "izeta")
  })

  it("rejects invalid usernames", () => {
    for (const username of ["ab", "a".repeat(21), "john doe", "john@mail.com"]) {
      assert.equal(RegisterRequestSchema.safeParse({ ...valid, username }).success, false, username)
    }
  })

  it("returns the password normalized", () => {
    assert.equal(RegisterRequestSchema.parse({ ...valid, password: "  correct horse  " }).password, "correct horse")
  })

  it("has no composition rules: any 8+ characters are accepted", () => {
    for (const password of ["abcdefgh", "12345678", "con espacios", "ñandú🦆🦆🦆"]) {
      assert.equal(RegisterRequestSchema.safeParse({ ...valid, password }).success, true, password)
    }
  })

  it("counts password length after trimming", () => {
    // 7 chars + 3 spaces: would pass min(8) if trimming happened after validation
    assert.equal(RegisterRequestSchema.safeParse({ ...valid, password: "abcdefg   " }).success, false)
  })

  it("rejects passwords longer than 64 characters", () => {
    assert.equal(RegisterRequestSchema.safeParse({ ...valid, password: "a".repeat(65) }).success, false)
  })

  it("rejects control characters in the password", () => {
    assert.equal(RegisterRequestSchema.safeParse({ ...valid, password: "abcd\u0000efgh" }).success, false)
  })
})

describe("LoginRequestSchema", () => {
  const valid = {
    username: "izeta",
    password: "correct horse",
  }

  it("accepts a valid request", () => {
    assert.equal(LoginRequestSchema.safeParse(valid).success, true)
  })

  it("rejects unknown keys (strict)", () => {
    assert.equal(LoginRequestSchema.safeParse({ ...valid, provider: "password" }).success, false)
  })

  it("does not apply the password policy", () => {
    // Shorter than today's minimum: must still reach verifyPassword, not be a 400.
    assert.equal(LoginRequestSchema.safeParse({ ...valid, password: "abc" }).success, true)
  })

  it("normalizes the password the same way as registration", () => {
    const password = "  e\u0301xito total \uFF21  " // decomposed 'é' and full-width 'Ａ'
    const login = LoginRequestSchema.parse({ ...valid, password })
    const register = RegisterRequestSchema.parse({ username: "izeta", email: "izeta@example.com", password })
    assert.equal(login.password, register.password)
  })

  it("rejects an empty or whitespace-only password", () => {
    for (const password of ["", "   "]) {
      assert.equal(LoginRequestSchema.safeParse({ ...valid, password }).success, false, JSON.stringify(password))
    }
  })

  it("rejects absurdly long passwords", () => {
    assert.equal(LoginRequestSchema.safeParse({ ...valid, password: "a".repeat(257) }).success, false)
  })
})
