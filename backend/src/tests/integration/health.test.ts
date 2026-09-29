import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../shared/database/database.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

describe("GET /health", () => {
  it("respond with 200 when the database is alive", async () => {
    const res = await request(app).get("/health")

    assert.equal(res.status, 200)
    assert.deepStrictEqual(res.body, { status: "ok" })
  })
})
