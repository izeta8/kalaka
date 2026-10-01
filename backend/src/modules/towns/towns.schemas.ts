// Is it a good idea to have a separated x.schemas.ts file?

import { z } from "zod"

export const SlugSchema = z.string().regex(/^[a-z-]+$/)

export const PostInsertSchema = z.object({
  content: z.string().min(1).max(500),
  replyToPostSlug: z.string().nonempty(),
})
