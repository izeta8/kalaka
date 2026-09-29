import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../shared/database/database.ts"
import { bizkaiaTowns, gipuzkoaTowns } from "../fixtures/towns.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

describe("GET /provinces/:slug/towns", () => {
  it("/provinces/gipuzkoa/towns responds with the 88 towns in Gipuzkoa", async () => {
    const res = await request(app).get("/provinces/gipuzkoa/towns")

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.body, gipuzkoaTowns)
  })

  it("/provinces/bizkaia/towns responds with the 112 towns in Bizkaia", async () => {
    const res = await request(app).get("/provinces/bizkaia/towns")

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.body, bizkaiaTowns)
  })

  it("/provinces/araba/towns responds with an empty array", async () => {
    const res = await request(app).get("/provinces/araba/towns")

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.body, [])
  })

  it("invalid province slug responds with error 400", async () => {
    const res = await request(app).get("/provinces/invalid_slug/towns")

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the slug must be a valid province name slug" })
  })

  it("invalid province slug responds with error 400", async () => {
    const res = await request(app).get("/provinces/bizkaia0/towns")

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the slug must be a valid province name slug" })
  })

  it("unexisting province slug responds with error 404", async () => {
    const res = await request(app).get("/provinces/madrid/towns")

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, { error: "there is no such province 'madrid'" })
  })
})
