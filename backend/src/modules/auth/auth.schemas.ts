import z from "zod"

// Normalizes a password by converting it to Unicode NFKC form (so visually equivalent characters compare equal) and trimming surrounding whitespace.
export const normalizePassword = (p: string) => p.normalize("NFKC").trim()

// Password policy
const PASSWORD_MIN = 8
const PASSWORD_MAX = 64

// Login only caps the length so we don't spend CPU normalizing and hashing huge inputs.
const LOGIN_PASSWORD_MAX = 256

// We allow uppercase usernames in the request but convert them to lowercase, the same way they are stored.
const UsernameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_]{3,20}$/)
  .transform((u) => u.toLowerCase())

const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const NewPasswordSchema = z
  .string()
  .transform(normalizePassword)
  .pipe(
    z
      .string()
      .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `At most ${PASSWORD_MAX} characters`)
      .regex(/^\P{Cc}*$/u, "Invalid characters"),
  )

// Strict: an unknown key is a 400 instead of being silently dropped.
export const RegisterRequestSchema = z.strictObject({
  username: UsernameSchema,
  email: EmailSchema,
  password: NewPasswordSchema,
})

// POST /auth/login is password-only for now. Google login will be an OAuth redirect flow with its own route.
// For now we only allow logging in with username, not with email.
// Strict: an unknown key is a 400 instead of being silently dropped.
export const LoginRequestSchema = z.strictObject({
  username: UsernameSchema,
  // Any non-empty string: whether it is right is verifyPassword's call, not the schema's.
  password: z.string().max(LOGIN_PASSWORD_MAX).transform(normalizePassword).pipe(z.string().min(1)),
})
