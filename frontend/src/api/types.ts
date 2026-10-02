// Types of the Kalaka API contract, as reported from the backend code.
// Do not add fields here that the backend does not send.

export interface Province {
  slug: string
  name: string
}

export interface Town {
  slug: string
  name: string
}

export interface UserPublic {
  publicId: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
}

export interface PostReplyTo {
  slug: string
  author: Pick<UserPublic, "username" | "displayName">
}

/** PROPOSED (not in the API): the room a post was published in, so a post page can link back to it. */
export interface PostRoom {
  province: Province
  town: Town | null
}

export interface PostPublic {
  slug: string
  /** null when the post has been deleted; it can still be replied to */
  content: string | null
  author: UserPublic
  replyTo: PostReplyTo | null
  /** ISO 8601 */
  createdAt: string
  /** ISO 8601, or null while the post exists */
  deletedAt: string | null
  /** PROPOSED (not in the API): number of direct replies. The UI works without it. */
  replyCount?: number
  /** PROPOSED (not in the API): see PostRoom. The UI works without it. */
  room?: PostRoom
}

/** Body of every POST that creates a post or a reply. Strict: no other keys. */
export interface NewPost {
  content: string
}

/**
 * A page of posts, newest first. PROPOSED contracts, not in the API yet (backend issues):
 * - a room's top-level posts: `GET /provinces/:provinceSlug/posts`, `GET /provinces/:provinceSlug/towns/:townSlug/posts`
 * - a post's direct replies: `GET /posts/:postSlug/replies`
 * Both take `?limit=20&before=<cursor>`.
 */
export interface PostPage {
  posts: PostPublic[]
  nextCursor: string | null
}

/** Body of every non-2xx response. `code` is planned, not sent yet. */
export interface ApiErrorBody {
  error: string
  code?: string
}

/** A room is a province, or a town inside a province. */
export interface Room {
  provinceSlug: string
  townSlug?: string
}

/** Limits that the API enforces on `NewPost.content` (after trimming). */
export const POST_CONTENT_MAX_LENGTH = 500
