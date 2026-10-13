import type { NextFunction, Request, Response } from "express"
import { SESSION_COOKIE_NAME } from "./auth.constants.ts"
import { findValidSessionByHash } from "./auth.repository.ts"
import { hashSessionToken } from "./auth.service.ts"

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1)

  if (!token) {
    res.status(401).send({ error: "unauthorized" })
    return
  }

  const session = await findValidSessionByHash(hashSessionToken(token))
  if (session === null) {
    res.status(401).send({ error: "unauthorized" })
    return
  }

  res.locals.userId = session.userId
  next()
}
