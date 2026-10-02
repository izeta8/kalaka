import "i18next"
import type eu from "./locales/eu.json"

// Type-checks every t() key against the Basque file, the source of truth.
declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof eu }
  }
}
