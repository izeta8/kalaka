import type { TFunction } from "i18next"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Relative time for recent posts ("duela 5 min"), short date after a day (SPEC.md section 4).
 * Uses Intl when the browser has data for the language. Chrome ships no Basque data
 * (it would print "5 min. ago"), so then it falls back to the translated `time.*` texts.
 */
export function formatPostDate(iso: string, language: string, t: TFunction, now: Date = new Date()): string {
  const date = new Date(iso)
  const elapsed = now.getTime() - date.getTime()

  if (elapsed < DAY) {
    const minutes = Math.floor(elapsed / MINUTE)
    const hours = Math.floor(elapsed / HOUR)
    if (Intl.RelativeTimeFormat.supportedLocalesOf(language).length > 0) {
      const relative = new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" })
      if (elapsed < MINUTE) return relative.format(0, "second")
      return elapsed < HOUR ? relative.format(-minutes, "minute") : relative.format(-hours, "hour")
    }
    if (elapsed < MINUTE) return t("time.now")
    return elapsed < HOUR ? t("time.minutes", { count: minutes }) : t("time.hours", { count: hours })
  }

  const sameYear = date.getFullYear() === now.getFullYear()
  if (Intl.DateTimeFormat.supportedLocalesOf(language).length > 0) {
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" }).format(date)
  }
  const day = date.getDate()
  if (!sameYear) {
    const monthNumber = String(date.getMonth() + 1).padStart(2, "0")
    return t("time.dateWithYear", { year: date.getFullYear(), monthNumber, day: String(day).padStart(2, "0") })
  }
  return t("time.date", { month: t("time.months").split("|")[date.getMonth()], day })
}
