import { setupServer } from "msw/node"
import { handlers } from "@/mocks/handlers"

/** The same handlers as the browser mock mode. Override per test with `server.use(...)`. */
export const server = setupServer(...handlers)
