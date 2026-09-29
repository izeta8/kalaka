import { type Request, type Response, Router } from "express"
import { townsRouter } from "../towns/towns.routes.ts"
import { getProvinces } from "./provinces.repository.ts"

export const provincesRouter = Router()

provincesRouter.get("/", async (_: Request, res: Response) => {
  const provinces = await getProvinces()
  res.status(200).send(provinces)
})

provincesRouter.use("/:provinceSlug/towns", townsRouter)
