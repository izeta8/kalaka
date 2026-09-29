import type { Server } from "node:http"
import { app } from "./app.ts"
import { pool } from "./database/database.ts"

const port = 3000

// Create the server and listen to connections
const server: Server = app.listen(port, async () => {
  console.log(`Example app listening on port ${port}`)
})

// Listen for termination signals
process.on("SIGINT", gracefulShutdown) // Triggered by Ctrl+C
process.on("SIGTERM", gracefulShutdown) // Triggered by Docker/Kubernetes

// Gracefully shutdown (e.g. close database connections...)
function gracefulShutdown(signal: NodeJS.Signals) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`)

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error("Error closing Express server:", err)
      process.exit(1)
    }
    console.log("Express server closed. No longer accepting requests.")

    // Execute custom cleanup code
    try {
      await pool.end()
      console.log("Database connections closed.")

      // 4. Exit successfully
      process.exit(0)
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError)
      process.exit(1)
    }
  })

  // Fail-safe timeout
  // Force shutdown if cleanup hangs (e.g., a database connection won't close)
  setTimeout(() => {
    console.error("Graceful shutdown timeout exceeded. Forcefully exiting...")
    process.exit(1)
  }, 10000) // 10 seconds
}
