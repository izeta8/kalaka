/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Kalaka API, e.g. http://localhost:3000 */
  readonly VITE_API_URL?: string
  /** "true" serves the API from the in-browser MSW mocks (src/mocks) */
  readonly VITE_API_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
