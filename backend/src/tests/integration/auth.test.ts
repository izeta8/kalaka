import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../shared/database/database.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

// Public data only: no internal id, no email
const PUBLIC_USER_KEYS = ["avatarUrl", "bio", "displayName", "publicId", "username"]

const registerUrl = "/auth/register"

// Unique values on every call, so tests don't collide with each other or with a previous run.
const newRegistration = () => {
  const id = randomBytes(4).toString("hex")
  return {
    username: `user_${id}`,
    email: `${id}@example.com`,
    password: "correct horse",
  }
}

describe("POST /auth/register", () => {
  it("creates the user and responds 201 with its public data", async () => {
    const data = newRegistration()

    const res = await request(app).post(registerUrl).send(data)

    assert.equal(res.status, 201)
    assert.deepStrictEqual(Object.keys(res.body).sort(), PUBLIC_USER_KEYS)
    assert.equal(res.body.username, data.username)
    // The display name starts as the username: the body has no displayName
    assert.equal(res.body.displayName, data.username)
  })

  it("stores the username in lowercase", async () => {
    const data = newRegistration()

    const res = await request(app)
      .post(registerUrl)
      .send({ ...data, username: data.username.toUpperCase() })

    assert.equal(res.status, 201)
    assert.equal(res.body.username, data.username)
  })

  it("responds 409 when the username is already taken", async () => {
    const data = newRegistration()
    await request(app).post(registerUrl).send(data)

    const res = await request(app)
      .post(registerUrl)
      .send({ ...newRegistration(), username: data.username })

    assert.equal(res.status, 409)
    assert.deepStrictEqual(res.body, { error: "username is already taken" })
  })

  it("responds 409 when the email is already taken", async () => {
    const data = newRegistration()
    await request(app).post(registerUrl).send(data)

    // The email is lowercased before storing it, so the uppercase one collides too
    const res = await request(app)
      .post(registerUrl)
      .send({ ...newRegistration(), email: data.email.toUpperCase() })

    assert.equal(res.status, 409)
    assert.deepStrictEqual(res.body, { error: "email is already taken" })
  })

  describe("with an invalid body", () => {
    const { password: _password, ...withoutPassword } = newRegistration()
    const invalidBodies = [
      { name: "a password that is too short", body: { ...newRegistration(), password: "short" } },
      { name: "a missing password", body: withoutPassword },
      // strictObject: an unknown key is rejected instead of being silently dropped
      { name: "an unknown key", body: { ...newRegistration(), displayName: "Izeta" } },
    ]

    for (const { name, body } of invalidBodies) {
      it(`responds 400 with ${name}`, async () => {
        const res = await request(app).post(registerUrl).send(body)

        assert.equal(res.status, 400)
        assert.deepStrictEqual(res.body, { error: "the body contains invalid data" })
      })
    }
  })

  it("does not register with GET", async () => {
    const res = await request(app).get(registerUrl)

    assert.equal(res.status, 404)
  })
})
