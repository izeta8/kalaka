import type { NextFunction, Request, Response } from "express"
import type { UserRow } from "../users/users.types.ts"
import { SESSION_COOKIE_NAME } from "./auth.constants.ts"
import { findValidSessionByHash } from "./auth.repository.ts"
import { hashSessionToken } from "./auth.service.ts"

declare module "express-serve-static-core" {
  interface Request {
    userId?: UserRow["id"]
  }
}

export function getSessionUserId(req: Request): UserRow["id"] {
  if (req.userId === undefined) {
    throw new Error("session user id is missing")
  }
  return req.userId
}

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

  req.userId = session.userId
  next()
}
