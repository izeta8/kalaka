import { type Request, type Response, Router } from "express"
import { type Result } from "../../shared/result.ts"
import { SlugSchema } from "../towns/towns.schemas.ts"
import { PostRequestSchema, PostSlugSchema } from "./posts.schemas.ts"
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
  result: Result<PostPublic, postsService.PublishPostError>,
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
    default:
      // If a new error is added to PublishPostError and not handled above, this line stops compiling
      result.error satisfies never
  }
}

// POST /posts/:postSlug/replies
// No province or town in the URL: the reply goes to the room of the replied post
export const createReply = async (req: Request, res: Response) => {
  const postSlug = PostSlugSchema.safeParse(req.params.postSlug)
  if (!postSlug.success) {
    res.status(400).send({ error: "the slug must be a valid post slug" })
    return
  }

  const body = PostRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }

  const result = await postsService.publishReply(postSlug.data, { ...body.data, authorId: MOCKED_AUTHOR_ID })

  if (result.ok) {
    res.status(201).send(result.value)
    return
  }

  switch (result.error) {
    case "author-not-found":
      res.status(404).send({ error: "the author does not exist" })
      return
    case "reply-to-not-found":
      res.status(404).send({ error: "the post you are replying to does not exist" })
      return
    default:
      result.error satisfies never
  }
}

export const postsRouter = Router()

postsRouter.post("/:postSlug/replies", createReply)
