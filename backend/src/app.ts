import express, { type Express, type NextFunction, type Request, type Response } from "express"
import { provincesRouter } from "./modules/provinces/provinces.routes.ts"
import * as database from "./shared/database/query.ts"
export const app: Express = express()

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const queryString = "SELECT 1"
    await database.query(queryString)
    res.status(200).send({ status: "ok" })
    return
  } catch (error) {
    console.error(error)
    res.status(503).send({ status: "error" })
    return
  }
})

app.use("/provinces", provincesRouter)

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).send({ error: "sorry, can't find that!" })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).send({ error: "there was an error in the request" })
})
