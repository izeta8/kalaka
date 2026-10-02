import { z } from "zod"

export const SlugSchema = z.string().regex(/^[a-z-]+$/)
