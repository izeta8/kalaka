import z from "zod"

const EnvSchema = z.object({
  // Server
  PORT: z.coerce.number().min(1).max(65535).default(3000),

  // Postgres
  POSTGRES_USER: z.string().nonempty(),
  POSTGRES_PASSWORD: z.string().nonempty(),
  POSTGRES_HOST: z.hostname().nonempty(),
  POSTGRES_PORT: z.coerce.number().min(1).max(65535),
  POSTGRES_DATABASE: z.coerce.string().nonempty(),
})

export const env = EnvSchema.parse(process.env)
