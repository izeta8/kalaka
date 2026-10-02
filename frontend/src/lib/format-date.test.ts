import { afterEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { formatPostDate } from "./format-date"

const now = new Date("2026-10-02T12:00:00Z")

function format(iso: string, language: "eu" | "es") {
  return formatPostDate(iso, language, i18n.getFixedT(language), now)
}

describe("formatPostDate", () => {
  afterEach(() => vi.restoreAllMocks())

  it("is relative for posts younger than a day", () => {
    expect(format("2026-10-02T11:55:00Z", "es")).toBe("hace 5 min")
    expect(format("2026-10-02T11:55:00Z", "eu")).toMatch(/^duela 5/)
  })

  it("is a short date after a day, with the year only when it is not this year", () => {
    expect(format("2026-09-14T10:00:00Z", "es")).toBe("14 sept")
    expect(format("2025-09-14T10:00:00Z", "es")).toMatch(/2025/)
  })

  it("falls back to the translated texts when the browser has no Intl data for the language (Chrome and Basque)", () => {
    vi.spyOn(Intl.RelativeTimeFormat, "supportedLocalesOf").mockReturnValue([])
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([])

    expect(format("2026-10-02T11:59:30Z", "eu")).toBe("orain")
    expect(format("2026-10-02T11:55:00Z", "eu")).toBe("duela 5 min")
    expect(format("2026-10-02T09:00:00Z", "eu")).toBe("duela 3 h")
    expect(format("2026-09-14T10:00:00Z", "eu")).toBe("ira. 14")
    expect(format("2025-09-04T10:00:00Z", "eu")).toBe("2025/09/04")
    expect(format("2026-09-14T10:00:00Z", "es")).toBe("14 sept")
  })
})
