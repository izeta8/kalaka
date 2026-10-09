import express, { type Express, type NextFunction, type Request, type Response } from "express"
import { authRouter } from "./modules/auth/auth.routes.ts"
import { postsRouter } from "./modules/posts/posts.routes.ts"
import { provincesRouter } from "./modules/provinces/provinces.routes.ts"
export const app: Express = express()

import { pool } from "./shared/database/database.ts"

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const query = {
      text: "SELECT 1",
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

// Parse JSON bodies into req.body
app.use(express.json())

app.use("/auth", authRouter)
app.use("/provinces", provincesRouter)
app.use("/posts", postsRouter)

app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).send({ error: "sorry, can't find that!" })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // express.json() marks a malformed body with this type: it is the client's fault, not a 500
  if ("type" in err && err.type === "entity.parse.failed") {
    res.status(400).send({ error: "the body is not valid JSON" })
    return
  }

  console.error(err.stack)
  res.status(500).send({ error: "there was an error in the request" })
})
