import { z } from "zod"

// Post slugs: 10 characters of a-z0-9 (posts_slug_format in the database)
export const PostSlugSchema = z.string().regex(/^[a-z0-9]{10}$/)

// Strict: an unknown key is a 400 instead of being silently dropped. Otherwise a replyToPostSlug sent
// to a room route would create a top-level post. Replies go through POST /posts/:postSlug/replies
export const PostRequestSchema = z.strictObject({
  content: z.string().trim().min(1).max(500),
})
