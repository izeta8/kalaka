import { runner } from "node-pg-migrate"
import type { ClientConfig } from "pg"
import z from "zod"
import { env } from "../shared/config/config.ts"

const DirectionSchema = z.enum(["up", "down"])

async function runMigrations() {
  // Catch console argument
  const direction = DirectionSchema.parse(process.argv[2] || "up")

  const databaseClient: ClientConfig = {
    user: env.POSTGRES_USER,
    database: env.POSTGRES_DB,
    password: env.POSTGRES_PASSWORD,
    port: env.POSTGRES_PORT,
    host: env.POSTGRES_HOST,
  }

  try {
    const migrations = await runner({
      databaseUrl: databaseClient,
      dir: "migrations",
      direction,
      migrationsTable: "pgmigrations",
    })

    if (migrations.length === 0) {
      console.log("No pending migrations. Database is already updated.")
    } else {
      console.log(`${migrations.length} migration have been updated successfully in the following direction: (${direction}):`)
      migrations.forEach((m) => console.log(` - ${m.name}`))
    }
  } catch (error) {
    console.error("There was an error executing migrations:", error)
    process.exit(1)
  }
}

await runMigrations()
