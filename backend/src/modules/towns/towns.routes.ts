import { type Request, type Response, Router } from "express"
import { z } from "zod"
import { getTownsByProvinceSlug } from "./towns.service.ts"

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
  const towns = await getTownsByProvinceSlug(provinceSlug)

  if (towns === null) {
    res.status(404).send({ error: `there is no such province '${provinceSlug}'` })
    return
  }

  res.status(200).send(towns)
})
