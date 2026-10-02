import type { Request, Response } from "express"
import { SlugSchema } from "../towns/towns.schemas.ts"
import { PostRequestSchema } from "./posts.schemas.ts"
import * as postsService from "./posts.service.ts"
import type { PostPublic } from "./posts.types.ts"

// Simulates the session. Authentication is not implemented yet.
const MOCKED_AUTHOR_ID = 1

// POST /provinces/:provinceSlug/towns/:townSlug/posts
export const createTownPost = async (req: Request, res: Response) => {
  const provinceSlug = SlugSchema.safeParse(req.params.provinceSlug)
  if (!provinceSlug.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }

  const townSlug = SlugSchema.safeParse(req.params.townSlug)
  if (!townSlug.success) {
    res.status(400).send({ error: "the slug must be a valid town slug" })
    return
  }

  const body = PostRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }

  const result = await postsService.publishPostInTown(provinceSlug.data, townSlug.data, {
    ...body.data,
    authorId: MOCKED_AUTHOR_ID,
  })

  sendPublishResult(res, result, { provinceSlug: provinceSlug.data, townSlug: townSlug.data })
}

// POST /provinces/:provinceSlug/posts
export const createProvincePost = async (req: Request, res: Response) => {
  const provinceSlug = SlugSchema.safeParse(req.params.provinceSlug)
  if (!provinceSlug.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }

  const body = PostRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }

  const result = await postsService.publishPostInProvince(provinceSlug.data, { ...body.data, authorId: MOCKED_AUTHOR_ID })

  sendPublishResult(res, result, { provinceSlug: provinceSlug.data })
}

// Translates the service result to an HTTP response. Both routes answer the same way.
const sendPublishResult = (
  res: Response,
  result: postsService.Result<PostPublic, postsService.PublishPostError>,
  { provinceSlug, townSlug }: { provinceSlug: string; townSlug?: string },
) => {
  if (result.ok) {
    res.status(201).send(result.value)
    return
  }

  switch (result.error) {
    case "author-not-found":
      res.status(404).send({ error: "the author does not exist" })
      return
    case "province-not-found":
      res.status(404).send({ error: `there is no such province '${provinceSlug}'` })
      return
    case "town-not-found":
      res.status(404).send({ error: `there is no such town '${townSlug}' in province '${provinceSlug}'` })
      return
    case "reply-to-not-found":
      res.status(404).send({ error: "the post you are replying to does not exist" })
      return
    default:
      // If a new error is added to PublishPostError and not handled above, this line stops compiling
      result.error satisfies never
  }
}
