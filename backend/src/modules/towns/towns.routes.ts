import { type Request, type Response, Router } from "express"
import { z } from "zod"
import { getTowns } from "./towns.repository.ts"

export const townsRouter = Router({ mergeParams: true })

const SlugSchema = z.string().regex(/^[a-z-]+$/)

townsRouter.get("/", async (req: Request, res: Response) => {
  // Validate route parameter. If it is invalid an error 400 will be thrown.
  const parsed = SlugSchema.safeParse(req.params.provinceSlug)
  if (!parsed.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }

  const provinceSlug = parsed.data
  const towns = await getTowns(provinceSlug)

  // If the array is empty means that the province doesn't exist.
  if (towns.length === 0) {
    res.status(404).send({ error: `there is no such province '${provinceSlug}'` })
    return
  }

  // If the province is valid but there is no town, respond a empty array.
  if (towns.length === 1 && towns[0].slug == null) {
    res.status(200).send([])
    return
  }

  res.status(200).send(towns)
})
