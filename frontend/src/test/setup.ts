import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest"
import i18n from "@/i18n"
import { resetMockDb } from "@/mocks/db"
import { server } from "./server"

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" })
  // jsdom does not implement scrolling; React Router's <ScrollRestoration> calls it on every navigation.
  window.scrollTo = () => {}
})

beforeEach(async () => {
  resetMockDb()
  window.localStorage.clear()
  await i18n.changeLanguage("eu")
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
