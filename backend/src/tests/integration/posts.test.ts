import assert from "node:assert/strict"
import { after, describe, it } from "node:test"
import request from "supertest"
import { app } from "../../app.ts"
import * as postsRepository from "../../modules/posts/posts.repository.ts"
import { pool } from "../../shared/database/database.ts"

// Without this the process of tests never ends
after(async () => {
  await pool.end()
})

// The author is mocked by the routes until authentication exists: the seeded user of 05-users.sql
const seededAuthor = {
  publicId: "12345678",
  username: "test",
  displayName: "test",
  bio: "test",
  avatarUrl: "https://www.test.com/test.png",
}

const PUBLIC_POST_KEYS = ["author", "content", "createdAt", "deletedAt", "replyTo", "slug"]
const POST_SLUG_FORMAT = /^[a-z0-9]{10}$/

const townPostsUrl = "/provinces/gipuzkoa/towns/zarautz/posts"
const provincePostsUrl = "/provinces/gipuzkoa/posts"

describe("POST /provinces/:provinceSlug/towns/:townSlug/posts", () => {
  it("creates a post in the town room and responds with its public data", async () => {
    const res = await request(app).post(townPostsUrl).send({ content: "Kaixo Zarautz!" })

    assert.equal(res.status, 201)
    assert.deepStrictEqual(Object.keys(res.body).sort(), PUBLIC_POST_KEYS)
    assert.match(res.body.slug, POST_SLUG_FORMAT)
    assert.equal(res.body.content, "Kaixo Zarautz!")
    assert.deepStrictEqual(res.body.author, seededAuthor)
    assert.equal(res.body.replyTo, null)
    assert.equal(res.body.deletedAt, null)
  })

  it("trims the content before saving it", async () => {
    const res = await request(app).post(townPostsUrl).send({ content: "   Kaixo!   " })

    assert.equal(res.status, 201)
    assert.equal(res.body.content, "Kaixo!")
  })

  it("responds 404 when the town does not exist", async () => {
    const res = await request(app).post("/provinces/gipuzkoa/towns/madrid/posts").send({ content: "Kaixo" })

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, { error: "there is no such town 'madrid' in province 'gipuzkoa'" })
  })

  it("responds 404 when the town exists but in another province", async () => {
    const res = await request(app).post("/provinces/bizkaia/towns/zarautz/posts").send({ content: "Kaixo" })

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, { error: "there is no such town 'zarautz' in province 'bizkaia'" })
  })

  it("responds 400 when the town slug is invalid", async () => {
    const res = await request(app).post("/provinces/gipuzkoa/towns/invalid_slug/posts").send({ content: "Kaixo" })

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the slug must be a valid town slug" })
  })
})

describe("POST /provinces/:provinceSlug/posts", () => {
  it("creates a post in the province room", async () => {
    const res = await request(app).post(provincePostsUrl).send({ content: "Kaixo Gipuzkoa!" })

    assert.equal(res.status, 201)
    assert.deepStrictEqual(Object.keys(res.body).sort(), PUBLIC_POST_KEYS)
    assert.equal(res.body.content, "Kaixo Gipuzkoa!")
  })

  it("responds 404 when the province does not exist", async () => {
    const res = await request(app).post("/provinces/madrid/posts").send({ content: "Kaixo" })

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, { error: "there is no such province 'madrid'" })
  })
})

const repliesUrl = (postSlug: string) => `/posts/${postSlug}/replies`

describe("POST /posts/:postSlug/replies", () => {
  it("creates a reply that references the replied post by slug and its author names only", async () => {
    const original = await request(app).post(townPostsUrl).send({ content: "Original post" })
    const reply = await request(app).post(repliesUrl(original.body.slug)).send({ content: "A reply" })

    assert.equal(reply.status, 201)
    assert.deepStrictEqual(Object.keys(reply.body).sort(), PUBLIC_POST_KEYS)
    assert.equal(reply.body.content, "A reply")
    assert.deepStrictEqual(reply.body.replyTo, { slug: original.body.slug, author: { username: "test", displayName: "test" } })
  })

  it("publishes the reply in the room of the replied post", async () => {
    const original = await request(app).post(townPostsUrl).send({ content: "Original post" })
    const reply = await request(app).post(repliesUrl(original.body.slug)).send({ content: "A reply" })

    // The room is internal: the API does not expose it, so the rows are read directly
    const originalRow = await postsRepository.findPostBySlug(original.body.slug)
    const replyRow = await postsRepository.findPostBySlug(reply.body.slug)
    assert.ok(originalRow !== null && replyRow !== null)
    assert.equal(replyRow.roomId, originalRow.roomId)
    assert.equal(replyRow.replyToId, originalRow.id)
  })

  it("allows replying to a deleted post and still shows its author", async () => {
    const original = await request(app).post(townPostsUrl).send({ content: "Original post" })
    const deletedPost = await postsRepository.softDeletePost(original.body.slug)
    assert.notEqual(deletedPost, null)

    const reply = await request(app).post(repliesUrl(original.body.slug)).send({ content: "A reply" })

    assert.equal(reply.status, 201)
    assert.deepStrictEqual(reply.body.replyTo, { slug: original.body.slug, author: { username: "test", displayName: "test" } })
  })

  it("responds 404 when the replied post does not exist", async () => {
    const res = await request(app).post(repliesUrl("zzzzzzzzzz")).send({ content: "A reply" })

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, { error: "the post you are replying to does not exist" })
  })

  it("responds 400 when the post slug is invalid", async () => {
    const res = await request(app).post(repliesUrl("NOT-A-SLUG")).send({ content: "A reply" })

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the slug must be a valid post slug" })
  })

  it("responds 400 when the body is invalid", async () => {
    const original = await request(app).post(townPostsUrl).send({ content: "Original post" })
    const res = await request(app).post(repliesUrl(original.body.slug)).send({ content: "" })

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the body contains invalid data" })
  })
})

describe("POST .../posts with an invalid body", () => {
  const invalidBodies = [
    { name: "empty content", body: { content: "" } },
    { name: "content with only spaces", body: { content: "     " } },
    { name: "content longer than 500 characters", body: { content: "a".repeat(501) } },
    { name: "missing content", body: {} },
    { name: "content that is not a string", body: { content: 42 } },
    // Replies go through POST /posts/:postSlug/replies: a room route must not drop the key and create a top-level post
    { name: "a replyToPostSlug", body: { content: "Kaixo", replyToPostSlug: "abcdefghij" } },
  ]

  for (const { name, body } of invalidBodies) {
    it(`responds 400 with ${name}`, async () => {
      const res = await request(app).post(townPostsUrl).send(body)

      assert.equal(res.status, 400)
      assert.deepStrictEqual(res.body, { error: "the body contains invalid data" })
    })
  }

  it("responds 400 when the body is not valid JSON", async () => {
    const res = await request(app).post(townPostsUrl).set("Content-Type", "application/json").send("{ not json")

    assert.equal(res.status, 400)
    assert.deepStrictEqual(res.body, { error: "the body is not valid JSON" })
  })
})
