import "@fontsource-variable/inter"
import "@fontsource-variable/outfit"
import "./index.css"
import "./i18n"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import { createQueryClient } from "./api/query-client"
import { AppProviders } from "./app-providers"
import { routes } from "./routes"

/** Mock mode (VITE_API_MOCK=true): MSW answers the API calls in the browser. Not bundled otherwise. */
async function enableApiMocks() {
  if (import.meta.env.VITE_API_MOCK !== "true") return
  const { worker } = await import("./mocks/browser")
  await worker.start({ onUnhandledRequest: "bypass" })
}

const router = createBrowserRouter(routes)
const queryClient = createQueryClient()

function render() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

// If the mocks cannot start (e.g. service workers blocked), render anyway: the calls then fail with the normal error states.
enableApiMocks()
  .catch((error: unknown) => console.error("Could not start the API mocks", error))
  .finally(render)
