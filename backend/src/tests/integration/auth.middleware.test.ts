import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { after, describe, it } from "node:test"
import express from "express"
import request from "supertest"
import { SESSION_COOKIE_NAME } from "../../modules/auth/auth.constants.ts"
import { requireSession } from "../../modules/auth/auth.middleware.ts"
import { createSession, hashSessionToken, login, register } from "../../modules/auth/auth.service.ts"
import { pool } from "../../shared/database/database.ts"
import { query } from "../../shared/database/query.ts"

after(async () => {
  await pool.end()
})

const app = express()
app.get("/protected", requireSession, (req, res) => {
  res.status(200).send({ userId: req.userId })
})

const createUserAndSession = async () => {
  const id = randomBytes(4).toString("hex")
  const credentials = { username: `user_${id}`, email: `${id}@example.com`, password: "correct horse" }
  await register(credentials)
  const loggedIn = await login({ username: credentials.username, password: credentials.password })
  assert.ok(loggedIn.ok)
  const session = await createSession(loggedIn.value.id)
  return { userId: loggedIn.value.id, token: session.token }
}

describe("requireSession", () => {
  it("returns 401 without a session cookie", async () => {
    const res = await request(app).get("/protected")

    assert.equal(res.status, 401)
    assert.deepStrictEqual(res.body, { error: "unauthorized" })
  })

  it("returns the same 401 for an unknown token", async () => {
    const res = await request(app).get("/protected").set("Cookie", `${SESSION_COOKIE_NAME}=unknown`)

    assert.equal(res.status, 401)
    assert.deepStrictEqual(res.body, { error: "unauthorized" })
  })

  it("passes the user id to the next handler for a valid session", async () => {
    const { userId, token } = await createUserAndSession()
    const res = await request(app).get("/protected").set("Cookie", `other=value; ${SESSION_COOKIE_NAME}=${token}`)

    assert.equal(res.status, 200)
    assert.equal(String(res.body.userId), String(userId))
  })

  it("returns 401 when the stored session has expired", async () => {
    const { token } = await createUserAndSession()
    await query("UPDATE sessions SET expires_at = now() - interval '1 second' WHERE session_hash = $1", [hashSessionToken(token)])

    const res = await request(app).get("/protected").set("Cookie", `${SESSION_COOKIE_NAME}=${token}`)

    assert.equal(res.status, 401)
    assert.deepStrictEqual(res.body, { error: "unauthorized" })
  })
})
