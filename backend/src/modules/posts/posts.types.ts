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

// Data user sends in the body when POST: /post in any endpoint (whether town, province...)
export interface PostRequestData {
  content: string
  replyToPostSlug: string | null
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

export interface PostPublic {
  slug: string
  content: string
  author: UserPublic
  replyTo: PostReference | null
  createdAt: Date
  deletedAt: Date | null
  // quoteToPost: PostPublic | null
}

export interface PostReference {
  slug: string
  author: UserPublic
}
