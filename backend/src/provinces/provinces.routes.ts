import { type Request, type Response, Router } from "express"
import * as database from "../database/query.ts"
import { townsRouter } from "../towns/towns.routes.ts"
import type { Province } from "../types/index.ts"

export const provincesRouter = Router()

provincesRouter.get("/", async (_: Request, res: Response) => {
  const query = `
    SELECT id, slug, name
    FROM provinces
    ORDER BY room_id`

  type ProvinceBasic = Pick<Province, "id" | "slug" | "name">

  const dbResponse = await database.query<ProvinceBasic>(query)
  const provinces = dbResponse.sort((a, b) => a.id - b.id)

  // We have fetched with the id so we can sort it. But we don't want to respond with the id.
  const responseProvinces = provinces.map((province) => ({ slug: province.slug, name: province.name }))

  res.status(200).send(responseProvinces)
})

provincesRouter.use("/:provinceSlug/towns", townsRouter)
