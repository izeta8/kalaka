import { type Request, type Response, Router } from "express"
import { z } from "zod"
import * as database from "../database/query.ts"
import type { Town } from "../types/index.ts"

export const townsRouter = Router({ mergeParams: true })

townsRouter.get("/", async (req: Request, res: Response) => {
  const provinceSlug = req.params.provinceSlug

  const SlugSchema = z.string().regex(/^[a-z-]+$/)

  // Validate route parameter. If it is invalid an error 400 will be thrown.
  const safeParse = SlugSchema.safeParse(provinceSlug)
  if (!safeParse.success) {
    res.status(400).send({ error: "the slug must be a valid province name slug" })
    return
  }

  // Check the requested province's towns.
  const queryString = `
      SELECT t.slug, t.name
      FROM provinces p
      LEFT JOIN towns t
      ON p.id = t.province_id
      WHERE p.slug = $1::text`

  type TownBasic = Pick<Town, "slug" | "name">

  const dbResponse = await database.query<TownBasic>(queryString, [provinceSlug])
  const towns = dbResponse.sort((a, b) => a.slug.localeCompare(b.slug))

  // If the array is empty means that the province doesn't exist.
  if (towns.length === 0) {
    res.status(404).send({ error: `there is no such province '${provinceSlug}'` })
    return
  }

  // If the province is valid but there is no town, respond a empty array.
  if (towns.length === 1 && towns[0].slug === null) {
    res.status(200).send([])
    return
  }

  res.status(200).send(towns)
})
