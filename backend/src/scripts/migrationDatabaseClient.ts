import type { ClientConfig } from "pg"
import { env } from "../shared/config/config.ts"

export const migrationDatabaseClient: ClientConfig = {
  user: env.POSTGRES_USER,
  database: env.POSTGRES_DB,
  password: env.POSTGRES_PASSWORD,
  port: env.POSTGRES_PORT,
  host: env.POSTGRES_HOST,
}