import { runner } from "node-pg-migrate"
import { migrationDatabaseClient } from "./migrate.ts";

async function runBaseline() {

  try {
    const migrations = await runner({
      databaseUrl: migrationDatabaseClient,
      dir: "migrations",
      direction: "up",
      fake: true,
      migrationsTable: "pgmigrations",
    })

    if (migrations.length === 0) {
      console.log("Baseline: nothing to mark, all migrations are already recorded.")
    } else {
      console.log(`Baseline: marked ${migrations.length} migrations as applied without running them:`)
      migrations.forEach((m) => console.log(` - ${m.name}`))
    }
  } catch (error) {
    console.error("Baseline failed:", error)
    process.exit(1)
  }
}

await runBaseline()
