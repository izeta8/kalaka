import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../database/database.ts"

describe("GET /towns", () => {
  // Without this the process of tests never ends
  after(async () => {
    await pool.end()
  })

  it("respond with the 200 towns currently in the database", async () => {
    const res = await request(app).get("/towns")

    assert.equal(res.status, 200)
    assert.equal(res.body.length, 200) // Currently 200 records in the table.
  })
})
