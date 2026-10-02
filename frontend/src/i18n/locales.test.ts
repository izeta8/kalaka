import { describe, expect, it } from "vitest"
import es from "./locales/es.json"
import eu from "./locales/eu.json"

// Plural forms differ per language (Spanish has "many", Basque does not), so they are compared without the suffix.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function keys(value: object, prefix = ""): string[] {
  const all = Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null ? keys(child, `${prefix}${key}.`) : [`${prefix}${key}`.replace(PLURAL_SUFFIX, "")],
  )
  return [...new Set(all)].sort()
}

describe("locales", () => {
  it("has the same keys in Basque and Spanish", () => {
    expect(keys(es)).toEqual(keys(eu))
  })
})
