import type { PostPublic, PostRoom, UserPublic } from "@/api/types"
import { provinces, seedPosts, seedUser, townsByProvince, users, type SeedUserKey } from "./data"

// In-memory store behind the mocked API. Posts created through the mocks live here until a reload
// (browser) or until resetMockDb() (tests).

interface StoredPost {
  post: PostPublic
  roomKey: string
}

/** All posts, newest first. Stored without the computed fields (replyCount, room). */
let posts: StoredPost[] = []

export function roomKey(provinceSlug: string, townSlug?: string): string {
  return townSlug ? `${provinceSlug}/${townSlug}` : provinceSlug
}

export function findProvince(provinceSlug: string) {
  return provinces.find((province) => province.slug === provinceSlug)
}

export function findTown(provinceSlug: string, townSlug: string) {
  return townsByProvince[provinceSlug]?.find((town) => town.slug === townSlug)
}

/** A room's top-level posts, newest first. */
export function roomPosts(key: string): PostPublic[] {
  return posts.filter((stored) => stored.roomKey === key && stored.post.replyTo === null).map(toPublic)
}

/** A post's direct replies, newest first. */
export function directReplies(postSlug: string): PostPublic[] {
  return posts.filter((stored) => stored.post.replyTo?.slug === postSlug).map(toPublic)
}

export function findPost(postSlug: string): PostPublic | undefined {
  const stored = posts.find((candidate) => candidate.post.slug === postSlug)
  return stored && toPublic(stored)
}

export function addPost(key: string, content: string, now = new Date()): PostPublic {
  const stored = { post: newPost(content, null, now), roomKey: key }
  posts.unshift(stored)
  return toPublic(stored)
}

/** A reply lives in the room of the post it answers. */
export function addReply(parentSlug: string, content: string, now = new Date()): PostPublic | undefined {
  const parent = posts.find((stored) => stored.post.slug === parentSlug)
  if (!parent) return undefined
  const stored = { post: newPost(content, parent.post, now), roomKey: parent.roomKey }
  posts.unshift(stored)
  return toPublic(stored)
}

export function resetMockDb(now = new Date()): void {
  let counter = 0
  const seeded: StoredPost[] = []

  for (const [key, seeds] of Object.entries(seedPosts)) {
    const created: PostPublic[] = []
    for (const seed of seeds) {
      const createdAt = new Date(now.getTime() - seed.minutesAgo * 60_000)
      const parent = seed.replyTo === undefined ? null : created[seed.replyTo]
      const post: PostPublic = {
        slug: `seed${String(counter++).padStart(6, "0")}`,
        content: seed.content,
        author: userFor(seed.author),
        replyTo: replyReference(parent),
        createdAt: createdAt.toISOString(),
        deletedAt: seed.content === null ? new Date(createdAt.getTime() + 5 * 60_000).toISOString() : null,
      }
      created.push(post)
      seeded.push({ post, roomKey: key })
    }
  }

  posts = seeded.sort((a, b) => b.post.createdAt.localeCompare(a.post.createdAt))
}

/** Adds the PROPOSED computed fields: replyCount and room. */
function toPublic({ post, roomKey: key }: StoredPost): PostPublic {
  const replyCount = posts.filter((stored) => stored.post.replyTo?.slug === post.slug).length
  return { ...post, replyCount, room: roomOf(key) }
}

function roomOf(key: string): PostRoom {
  const [provinceSlug, townSlug] = key.split("/")
  const province = findProvince(provinceSlug)!
  return { province, town: townSlug ? findTown(provinceSlug, townSlug)! : null }
}

function newPost(content: string, parent: PostPublic | null, now: Date): PostPublic {
  return { slug: newPostSlug(), content, author: seedUser, replyTo: replyReference(parent), createdAt: now.toISOString(), deletedAt: null }
}

function replyReference(parent: PostPublic | null): PostPublic["replyTo"] {
  return parent && { slug: parent.slug, author: { username: parent.author.username, displayName: parent.author.displayName } }
}

function userFor(key: SeedUserKey): UserPublic {
  return key === "test" ? seedUser : users[key]
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

/** Post slugs match the API: `^[a-z0-9]{10}$`. */
function newPostSlug(): string {
  let slug = ""
  do {
    slug = Array.from({ length: 10 }, () => SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)]).join("")
  } while (posts.some((stored) => stored.post.slug === slug))
  return slug
}

resetMockDb()
