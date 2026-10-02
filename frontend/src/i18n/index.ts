import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { readStorage, writeStorage } from "@/lib/storage"
import es from "./locales/es.json"
import eu from "./locales/eu.json"

export const LANGUAGES = [
  { code: "eu", name: "Euskara" },
  { code: "es", name: "Español" },
] as const

export type Language = (typeof LANGUAGES)[number]["code"]

export const DEFAULT_LANGUAGE: Language = "eu"

// Must match the inline script in index.html.
const STORAGE_KEY = "kalaka.language"

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value)
}

function storedLanguage(): Language {
  const stored = readStorage(STORAGE_KEY)
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language
  writeStorage(STORAGE_KEY, language)
})

void i18n.use(initReactI18next).init({
  resources: { eu: { translation: eu }, es: { translation: es } },
  lng: storedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((language) => language.code),
  interpolation: { escapeValue: false }, // React already escapes.
  initAsync: false, // Resources are bundled: translate on the first render.
})

export default i18n
