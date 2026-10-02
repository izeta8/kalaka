import { apiRequest } from "./client"
import type { NewPost, PostPage, PostPublic, Province, Room, Town } from "./types"

const segment = encodeURIComponent

export const POSTS_PAGE_SIZE = 20

function pageQuery(before?: string): string {
  const query = new URLSearchParams({ limit: String(POSTS_PAGE_SIZE) })
  if (before) query.set("before", before)
  return query.toString()
}

export function roomPath({ provinceSlug, townSlug }: Room): string {
  const province = `/provinces/${segment(provinceSlug)}`
  return townSlug ? `${province}/towns/${segment(townSlug)}` : province
}

export function getProvinces(signal?: AbortSignal) {
  return apiRequest<Province[]>("/provinces", { signal })
}

export function getTowns(provinceSlug: string, signal?: AbortSignal) {
  return apiRequest<Town[]>(`/provinces/${segment(provinceSlug)}/towns`, { signal })
}

interface PageOptions {
  before?: string
  signal?: AbortSignal
}

/** PROPOSED contract: a room's top-level posts (see PostPage). */
export function getRoomPosts(room: Room, { before, signal }: PageOptions = {}) {
  return apiRequest<PostPage>(`${roomPath(room)}/posts?${pageQuery(before)}`, { signal })
}

/** PROPOSED contract: `GET /posts/:postSlug` → PostPublic; 404 when it does not exist. */
export function getPost(postSlug: string, signal?: AbortSignal) {
  return apiRequest<PostPublic>(`/posts/${segment(postSlug)}`, { signal })
}

/** PROPOSED contract: a post's direct replies (see PostPage). */
export function getReplies(postSlug: string, { before, signal }: PageOptions = {}) {
  return apiRequest<PostPage>(`/posts/${segment(postSlug)}/replies?${pageQuery(before)}`, { signal })
}

export function createPost(room: Room, post: NewPost) {
  return apiRequest<PostPublic>(`${roomPath(room)}/posts`, { method: "POST", body: post })
}

export function createReply(postSlug: string, post: NewPost) {
  return apiRequest<PostPublic>(`/posts/${segment(postSlug)}/replies`, { method: "POST", body: post })
}
