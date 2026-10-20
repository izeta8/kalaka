import { runner } from "node-pg-migrate"
import z from "zod"
import { migrationDatabaseClient } from "./migrationDatabaseClient.ts";

const DirectionSchema = z.enum(["up", "down"])

async function runMigrations() {
  // Catch console argument
  const direction = DirectionSchema.parse(process.argv[2] || "up")

  try {
    const migrations = await runner({
      databaseUrl: migrationDatabaseClient,
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
