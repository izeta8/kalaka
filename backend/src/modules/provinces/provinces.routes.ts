import { type Request, type Response, Router } from "express"
import { createProvincePost } from "../posts/posts.routes.ts"
import { townsRouter } from "../towns/towns.routes.ts"
import * as provincesRepository from "./provinces.repository.ts"

export const provincesRouter = Router()

provincesRouter.get("/", async (_: Request, res: Response) => {
  const provinces = await provincesRepository.findProvinces()
  res.status(200).send(provinces)
})

provincesRouter.post("/:provinceSlug/posts", createProvincePost)

provincesRouter.use("/:provinceSlug/towns", townsRouter)
