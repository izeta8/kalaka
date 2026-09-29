import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../shared/database/database.ts"
import { provinces } from "../fixtures/provinces.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

describe("GET /provinces", () => {
  it("respond with the 7 provinces of the basque country", async () => {
    const res = await request(app).get("/provinces")
    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.body, provinces)
  })
})
