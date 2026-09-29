import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../database/database.ts"

describe("GET /health", () => {
  // Without this the process of tests never ends
  after(async () => {
    await pool.end()
  })

  it("respond with 200 when the database is alive", async () => {
    const res = await request(app).get("/health")

    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { status: "ok" })
  })
})
