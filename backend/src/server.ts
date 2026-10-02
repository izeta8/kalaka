import type { Server } from "node:http"
import { app } from "./app.ts"
import { env } from "./shared/config/config.ts"
import { pool } from "./shared/database/database.ts"

const port = env.PORT

// Create the server and listen to connections
const server: Server = app.listen(port, () => {
  console.log(`kalaka backend running in port ${port}`)
})

// Listen for termination signals
process.on("SIGINT", gracefulShutdown) // Triggered by Ctrl+C
process.on("SIGTERM", gracefulShutdown) // Triggered by Docker/Kubernetes

// Gracefully shutdown (e.g. close database connections...)
function gracefulShutdown(signal: NodeJS.Signals) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`)

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error("Error closing Express server:", err)
      process.exit(1)
    }
    console.log("Express server closed. No longer accepting requests.")

    void cleanup()
  })

  // Fail-safe timeout
  // Force shutdown if cleanup hangs (e.g., a database connection won't close)
  setTimeout(() => {
    console.error("Graceful shutdown timeout exceeded. Forcefully exiting...")
    process.exit(1)
  }, 10000).unref() // 10 seconds; unref so the timer alone doesn't keep the process alive
}

// Execute custom cleanup code
async function cleanup() {
  try {
    await pool.end()
    console.log("Database connections closed.")
    process.exit(0)
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError)
    process.exit(1)
  }
}
