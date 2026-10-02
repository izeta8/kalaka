import { Pool, types as PgTypes } from "pg"
import { env } from "../config/config.ts"

// By default node-postgres returns BIGINTs as strings.
// With this parser we get as numbers.
PgTypes.setTypeParser(20, (val) => parseInt(val, 10))

// Create and export the pool
export const pool = new Pool({
  // Connection
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DATABASE,

  // Pool configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxLifetimeSeconds: 60,
})

// The server would close if we didn't catch errors.
pool.on("error", (err) => {
  console.log(`there was an error in the database: ${err.stack}`)
})
