import express, { type Express, type NextFunction, type Request, type Response } from "express"
import z from "zod"
import { pool } from "./database/database.ts"
import type { Province, Town } from "./types/tables.ts"

export const app: Express = express()

app.get("/", (_: Request, res: Response) => {
  res.send("Hello keloke ss!")
})

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const query = {
      text: `SELECT id FROM towns LIMIT 1`,
    }
    await pool.query(query)
    res.status(200).send({ status: "ok" })
    return
  } catch (error) {
    console.error(error)
    res.status(503).send({ status: "error" })
    return
  }
})

app.get("/provinces", async (_: Request, res: Response) => {
  const query = {
    text: `
    SELECT slug, name
    FROM provinces
    ORDER BY room_id`,
  }
  type ProvinceBasic = Pick<Province, "slug" | "name">

  const dbResponse = await pool.query<ProvinceBasic>(query)
  const provinces = dbResponse.rows

  res.status(200).send(provinces)
})

app.get("/provinces/:provinceSlug/towns", async (req: Request, res: Response) => {
  const provinceSlug = req.params.provinceSlug

  const SlugSchema = z.string().regex(/^[a-z-]+$/)

  // Validate route parameter. If it is invalid an error 400 will be thrown.
  const safeParse = SlugSchema.safeParse(provinceSlug)
  if (!safeParse.success) {
    res.status(400).send(`the slug must be a valid province name slug`)
    return
  }

  // Check the requested province's towns.
  const query = {
    text: `
      SELECT t.slug, t.name, t.room_id
      FROM provinces p
      LEFT JOIN towns t
      ON p.id = t.province_id
      WHERE p.slug = $1::text`,
    values: [provinceSlug],
  }

  type TownBasic = Pick<Town, "slug" | "name" | "room_id">

  const dbResponse = await pool.query<TownBasic>(query)
  const towns = dbResponse.rows

  // If the array is empty means that the province doesn't exist.
  if (towns.length === 0) {
    res.status(404).send(`there is no such town '${provinceSlug}'`)
    return
  }

  // If the province is valid but there is no town, respond a empty array.
  if (towns.length === 1 && towns[0].slug === null) {
    res.status(200).send([])
    return
  }

  res.status(200).send(towns)
})

app.get("/towns", async (_req: Request, res: Response) => {
  const query = {
    text: `
    SELECT t.slug, t.name, t.room_id, t.province_id
    FROM towns t`,
  }

  type TownResponse = Pick<Town, "slug" | "name" | "room_id" | "province_id">
  const dbResponse = await pool.query<TownResponse>(query)
  const towns: TownResponse[] = dbResponse.rows

  res.status(200).send(towns)
})

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).send("Sorry can't find that!")
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).send({ error: "there was an error in the request" })
})
