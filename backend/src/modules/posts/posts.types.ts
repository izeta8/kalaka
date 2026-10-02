import type { UserPublic } from "../users/users.types.ts"

// Quotes are not in the v0

export interface PostRow {
  id: number
  slug: string
  content: string
  authorId: number
  replyToId: number | null
  roomId: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  // quoteToId: number | null
}

// Data user sends in the body of any post endpoint (town, province or reply).
// What the post replies to comes from the URL, not from the body
export interface PostRequestData {
  content: string
  // quoteToPostSlug: string | null
}

// Type that receives the repository layer to insert the post
export interface PostInsert {
  slug: string
  content: string
  authorId: number
  replyToId: number | null
  roomId: number
  // quoteToId: number | null
}

// The post a reply points to: only what the UI needs to show "replying to <display name> (@username)" and link to it
export interface PostReference {
  slug: string
  author: Pick<UserPublic, "username" | "displayName">
}

export interface PostPublic {
  slug: string
  content: string | null // null when the post has been deleted
  author: UserPublic
  replyTo: PostReference | null
  createdAt: Date
  deletedAt: Date | null
  // quoteTo: PostReference | null
}
