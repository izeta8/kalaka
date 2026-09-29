import express, { type Express, type NextFunction, type Request, type Response } from "express"
import z from "zod"
import * as database from "./database/query.ts"
import type { Town } from "./types/tables.ts"
export const app: Express = express()

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const queryString = "SELECT id FROM towns LIMIT 1"
    await database.query(queryString)
    res.status(200).send({ status: "ok" })
    return
  } catch (error) {
    console.error(error)
    res.status(503).send({ status: "error" })
    return
  }
})

app.get("/provinces/:provinceSlug/towns", async (req: Request, res: Response) => {
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

// For now makes no sense to have a /towns endpoint, but we will keep it for educational purposes.
// When more endpoints are created we will get rid of this.
app.get("/towns", async (_req: Request, res: Response) => {
  const queryString = `
    SELECT t.slug, t.name, p.slug as "province_slug"
    FROM towns t
    INNER JOIN provinces p
    ON t.province_id = p.id`

  type TownResponse = Pick<Town, "slug" | "name"> & { province_slug: string }
  const dbResult = await database.query<TownResponse>(queryString)
  const towns: TownResponse[] = dbResult.sort((a, b) => a.name.localeCompare(b.name))

  res.status(200).send(towns)
})

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).send({ error: "sorry, can't find that!" })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).send({ error: "there was an error in the request" })
})
