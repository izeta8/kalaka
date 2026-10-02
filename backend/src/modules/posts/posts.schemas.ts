import { z } from "zod"

export const PostRequestSchema = z.object({
  content: z.string().trim().min(1).max(500),
  replyToPostSlug: z
    .string()
    .regex(/^[a-z0-9]{10}$/)
    .nullish()
    .transform((slug) => slug ?? null),
})
