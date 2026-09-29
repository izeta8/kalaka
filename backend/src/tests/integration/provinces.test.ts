import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import { pool } from "../../database/database.ts"

describe("GET /provinces", () => {
  // Without this the process of tests never ends
  after(async () => {
    await pool.end()
  })

  it("respond with the 7 provinces of the basque country", async () => {
    const res = await request(app).get("/provinces")

    const expectedProvinces = [
      {
        slug: "gipuzkoa",
        name: "Gipuzkoa",
      },
      {
        slug: "bizkaia",
        name: "Bizkaia",
      },
      {
        slug: "araba",
        name: "Araba",
      },
      {
        slug: "nafarroa",
        name: "Nafarroa",
      },
      {
        slug: "lapurdi",
        name: "Lapurdi",
      },
      {
        slug: "nafarroa-beherea",
        name: "Nafarroa Beherea",
      },
      {
        slug: "zuberoa",
        name: "Zuberoa",
      },
    ]

    assert.equal(res.status, 200)
    assert.deepEqual(res.body, expectedProvinces)
  })
})
