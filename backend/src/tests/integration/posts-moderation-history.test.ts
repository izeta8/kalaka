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

// Registers a fresh user, publishes one post through the API and returns both ids
const publishPostAsNewUser = async () => {
  const id = randomBytes(4).toString("hex")
  const credentials = { username: `history_${id}`, email: `history_${id}@example.com`, password: "correct horse" }
  await request(app).post("/auth/register").send(credentials)
  const login = await request(app).post("/auth/login").send({ username: credentials.username, password: credentials.password })
  assert.equal(login.status, 200)
  const cookie = String(login.headers["set-cookie"]).split(";")[0]

  const res = await request(app).post("/provinces/gipuzkoa/towns/zarautz/posts").set("Cookie", cookie).send({ content: "Kaixo historia!" })
  assert.equal(res.status, 201)

  const { rows } = await pool.query<{ id: string }>("SELECT id FROM posts WHERE slug = $1", [res.body.slug])
  return { username: credentials.username, postId: rows[0].id }
}

const insertHistoryRow = (postId: string, tags: string[]) =>
  pool.query(
    `INSERT INTO posts_moderation_history (post_id, from_status, to_status, actor, tags, model)
     VALUES ($1, 'pending', 'censored', 'ai', $2, 'gemma3:4b')`,
    [postId, tags],
  )

describe("posts_moderation_history", () => {
  it("deleting a user also deletes the moderation history of their posts", async () => {
    const { username, postId } = await publishPostAsNewUser()
    await insertHistoryRow(postId, ["insult"])

    await pool.query("DELETE FROM users WHERE username = $1", [username])

    const { rows } = await pool.query("SELECT 1 FROM posts_moderation_history WHERE post_id = $1", [postId])
    assert.equal(rows.length, 0)
  })

  it("the database rejects a tag outside the moderation labels", async () => {
    const { postId } = await publishPostAsNewUser()

    // A status is not a label: this is the mix-up the CHECK has to catch
    await assert.rejects(insertHistoryRow(postId, ["approved"]), { code: "23514" })
  })
})
