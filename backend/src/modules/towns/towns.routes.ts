import { type Request, type Response, Router } from "express"
import { PostRequestSchema } from "../posts/posts.schemas.ts"
import * as postsService from "../posts/posts.service.ts"
import type { PostRequestData } from "../posts/posts.types.ts"
import { SlugSchema } from "./towns.schemas.ts"
import * as townsService from "./towns.service.ts"

export const townsRouter = Router({ mergeParams: true })

townsRouter.get("/", async (req: Request, res: Response) => {
  // Validate route parameter. If it is invalid an error 400 will be thrown.
  const parsed = SlugSchema.safeParse(req.params.provinceSlug)
  if (!parsed.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }

  const provinceSlug = parsed.data
  const towns = await townsService.getTownsByProvinceSlug(provinceSlug)

  if (towns === null) {
    res.status(404).send({ error: `there is no such province '${provinceSlug}'` })
    return
  }

  res.status(200).send(towns)
})

townsRouter.post("/:townSlug/posts", async (req: Request, res: Response) => {
  const authorId = 1 // Simluates the cookie or session. Authentication is not implemented yet.

  // Validate route parameters
  const parsedProvinceSlug = SlugSchema.safeParse(req.params.provinceSlug)
  if (!parsedProvinceSlug.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }
  const provinceSlug = parsedProvinceSlug.data

  const parsedTownSlug = SlugSchema.safeParse(req.params.townSlug)
  if (!parsedTownSlug.success) {
    res.status(400).send({ error: "the slug must be a valid town slug" })
    return
  }
  const townSlug = parsedTownSlug.data

  // Validate body schema
  const parsedRequestBody = PostRequestSchema.safeParse(req.body)
  if (!parsedRequestBody.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }
  const { content, replyToPostSlug }: PostRequestData = parsedRequestBody.data

  const result = await postsService.publishPost(content, replyToPostSlug, provinceSlug, townSlug, authorId)

  // Handle errors
  if (!result.ok) {
    let message: string = "there was an unexpected error"
    switch (result.error) {
      case "author-not-found":
        message = "the author does not exist"
        break
      case "town-not-found":
        message = "the town does not exist"
        break
    }
    res.status(404).send({ error: message })
    return
  }

  // If reached here the insert has been successfull
  // Return the public data of the created post
  res.status(201).send(result.value)
  return
})
