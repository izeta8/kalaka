import { type Request, type Response, Router } from "express"
import { env } from "../../shared/config/config.ts"
import { toPublicUser } from "../users/users.service.ts"
import type { UserPublic } from "../users/users.types.ts"
import { SESSION_COOKIE_NAME } from "./auth.constants.ts"
import { LoginRequestSchema, RegisterRequestSchema } from "./auth.schemas.ts"
import * as authService from "./auth.service.ts"

export const authRouter = Router()

authRouter.post("/register", registerUser)
authRouter.post("/login", loginUser)

async function registerUser(req: Request, res: Response) {
  const body = RegisterRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }

  const registerResult = await authService.register(body.data)

  if (registerResult.ok) {
    // Type variable as UserPublic to type the value we send. Prevents future possible change in the value returned in authSerivce.register()
    const userPublic: UserPublic = registerResult.value
    res.status(201).send(userPublic)
    return
  }

  // Handle errors
  switch (registerResult.error) {
    case "email-taken":
      res.status(409).send({ error: "email is already taken" })
      break
    case "username-taken":
      res.status(409).send({ error: "username is already taken" })
      break
    default:
      // If a new error is added to RegisterError and not handled above, this line stops compiling
      registerResult.error satisfies never
  }
}

async function loginUser(req: Request, res: Response) {
  const body = LoginRequestSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).send({ error: "the body contains invalid data" })
    return
  }

  const loginResult = await authService.login(body.data)
  if (!loginResult.ok) {
    res.status(401).send({ error: "invalid credentials" })
    return
  }

  const user = loginResult.value
  const { token, expiresAt } = await authService.createSession(user.id)
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
  res.status(200).send(toPublicUser(user))
}
