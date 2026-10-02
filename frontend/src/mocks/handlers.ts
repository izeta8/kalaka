import { delay, http, HttpResponse } from "msw"
import { apiUrl } from "@/api/client"
import {
  POST_CONTENT_MAX_LENGTH,
  type ApiErrorBody,
  type NewPost,
  type PostPage,
  type PostPublic,
  type Province,
  type Town,
} from "@/api/types"
import { provinces, townsByProvince } from "./data"
import { addPost, addReply, directReplies, findPost, findProvince, findTown, roomKey, roomPosts } from "./db"

// Mocked Kalaka API, shared by the tests (msw/node) and the browser mock mode (msw/browser).
// Paths, bodies, status codes and error texts follow the backend contract. PROPOSED (backend issues,
// not in the API yet): the room-posts and replies listings, GET /posts/:postSlug, and the
// `replyCount` and `room` fields of every post.

const PROVINCE_SLUG = /^[a-z-]+$/
const TOWN_SLUG = /^[a-z-]+$/ // Assumption: the contract gives the error text, not the town regex.
const POST_SLUG = /^[a-z0-9]{10}$/
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100 // PROPOSED contract does not fix a maximum.

function error(status: number, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: message }, { status })
}

type Params = { provinceSlug: string; townSlug?: string; postSlug?: string }

/** Validates the room in the path. Returns an error response, or null when the room exists. */
function checkRoom({ provinceSlug, townSlug }: Params) {
  if (!PROVINCE_SLUG.test(provinceSlug)) return error(400, "the slug must be a valid province name slug")
  if (!findProvince(provinceSlug)) return error(404, `there is no such province '${provinceSlug}'`)
  if (townSlug === undefined) return null
  if (!TOWN_SLUG.test(townSlug)) return error(400, "the slug must be a valid town slug")
  if (!findTown(provinceSlug, townSlug)) return error(404, `there is no such town '${townSlug}' in province '${provinceSlug}'`)
  return null
}

/** Parses a strict `{ content }` body. Returns the trimmed content or an error response. */
async function readNewPost(request: Request): Promise<string | Response> {
  let body: unknown
  try {
    body = JSON.parse(await request.text())
  } catch {
    return error(400, "the body is not valid JSON")
  }
  const fields = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Partial<NewPost>) : null
  const content = fields?.content
  if (!fields || Object.keys(fields).length !== 1 || typeof content !== "string") return error(400, "the body contains invalid data")
  const trimmed = content.trim()
  if (trimmed.length < 1 || trimmed.length > POST_CONTENT_MAX_LENGTH) return error(400, "the body contains invalid data")
  return trimmed
}

/** PROPOSED contract: newest first, `?limit=&before=<cursor>` → `{ posts, nextCursor }`. The cursor is the last post's slug. */
function paginate(request: Request, all: PostPublic[]) {
  const query = new URL(request.url).searchParams
  const limit = Number(query.get("limit") ?? DEFAULT_PAGE_SIZE)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return error(400, "the query contains invalid data")

  const before = query.get("before")
  let start = 0
  if (before !== null) {
    const index = all.findIndex((post) => post.slug === before)
    if (index === -1) return error(400, "the query contains invalid data")
    start = index + 1
  }

  const posts = all.slice(start, start + limit)
  const hasMore = start + limit < all.length
  return HttpResponse.json<PostPage>({ posts, nextCursor: hasMore ? posts[posts.length - 1].slug : null })
}

/** A room's top-level posts. */
function listRoomPosts(request: Request, params: Params) {
  const roomError = checkRoom(params)
  if (roomError) return roomError
  return paginate(request, roomPosts(roomKey(params.provinceSlug, params.townSlug)))
}

/** Validates a post slug in the path. Returns an error response, or null when the post exists. */
function checkPost(postSlug: string, notFound: string) {
  if (!POST_SLUG.test(postSlug)) return error(400, "the slug must be a valid post slug")
  if (!findPost(postSlug)) return error(404, notFound)
  return null
}

async function createRoomPost(request: Request, params: Params) {
  const roomError = checkRoom(params)
  if (roomError) return roomError
  const content = await readNewPost(request)
  if (content instanceof Response) return content
  return HttpResponse.json<PostPublic>(addPost(roomKey(params.provinceSlug, params.townSlug), content), { status: 201 })
}

export const handlers = [
  http.get(apiUrl("/provinces"), async () => {
    await delay()
    return HttpResponse.json<Province[]>(provinces)
  }),

  http.get<Params>(apiUrl("/provinces/:provinceSlug/towns"), async ({ params }) => {
    await delay()
    const roomError = checkRoom({ provinceSlug: params.provinceSlug })
    if (roomError) return roomError
    return HttpResponse.json<Town[]>(townsByProvince[params.provinceSlug] ?? [])
  }),

  http.get<Params>(apiUrl("/provinces/:provinceSlug/posts"), async ({ request, params }) => {
    await delay()
    return listRoomPosts(request, { provinceSlug: params.provinceSlug })
  }),

  http.get<Params>(apiUrl("/provinces/:provinceSlug/towns/:townSlug/posts"), async ({ request, params }) => {
    await delay()
    return listRoomPosts(request, params)
  }),

  http.post<Params>(apiUrl("/provinces/:provinceSlug/posts"), async ({ request, params }) => {
    await delay()
    return createRoomPost(request, { provinceSlug: params.provinceSlug })
  }),

  http.post<Params>(apiUrl("/provinces/:provinceSlug/towns/:townSlug/posts"), async ({ request, params }) => {
    await delay()
    return createRoomPost(request, params)
  }),

  http.get<{ postSlug: string }>(apiUrl("/posts/:postSlug"), async ({ params }) => {
    await delay()
    const postError = checkPost(params.postSlug, "the post does not exist")
    if (postError) return postError
    return HttpResponse.json<PostPublic>(findPost(params.postSlug)!)
  }),

  http.get<{ postSlug: string }>(apiUrl("/posts/:postSlug/replies"), async ({ request, params }) => {
    await delay()
    const postError = checkPost(params.postSlug, "the post does not exist")
    if (postError) return postError
    return paginate(request, directReplies(params.postSlug))
  }),

  http.post<{ postSlug: string }>(apiUrl("/posts/:postSlug/replies"), async ({ request, params }) => {
    await delay()
    const postError = checkPost(params.postSlug, "the post you are replying to does not exist")
    if (postError) return postError
    const content = await readNewPost(request)
    if (content instanceof Response) return content
    return HttpResponse.json<PostPublic>(addReply(params.postSlug, content)!, { status: 201 })
  }),

  // Anything else under the API origin behaves like the API's unknown route.
  http.all(apiUrl("/*"), async () => {
    await delay()
    return error(404, "sorry, can't find that!")
  }),
]
