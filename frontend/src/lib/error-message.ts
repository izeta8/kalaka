import { ApiError, NetworkError } from "@/api/errors"

// API errors are English developer messages: the UI never shows them (SPEC.md section 4).
// It maps the HTTP status to a translated message instead.
// TODO: map the stable error `code` first, once the backend sends it.

export type ErrorContext = "load" | "publish" | "reply"
export type ErrorKind = "network" | "badRequest" | "notFound" | "server" | "unknown"

export function errorKind(error: unknown): ErrorKind {
  if (error instanceof NetworkError) return "network"
  if (!(error instanceof ApiError)) return "unknown"
  if (error.status === 400) return "badRequest"
  if (error.status === 404) return "notFound"
  if (error.status >= 500) return "server"
  return "unknown"
}

export function errorMessageKey<C extends ErrorContext>(error: unknown, context: C) {
  return `errors.${context}.${errorKind(error)}` as const
}

/** A page whose slug the API rejects (400) or does not know (404) does not exist for the user. */
export function isMissingPage(error: unknown): boolean {
  const kind = errorKind(error)
  return kind === "notFound" || kind === "badRequest"
}
