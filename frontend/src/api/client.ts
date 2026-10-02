import { ApiError, NetworkError } from "./errors"
import type { ApiErrorBody } from "./types"

/** Builds an absolute API URL. The base comes only from VITE_API_URL (SPEC.md section 3). */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL
  if (!base) throw new Error("VITE_API_URL is not set: copy .env.example to .env")
  return `${base.replace(/\/+$/, "")}${path}`
}

interface RequestOptions {
  method?: "GET" | "POST"
  body?: unknown
  signal?: AbortSignal
}

/** The only place that calls `fetch`. Resolves with the parsed JSON body or rejects with ApiError / NetworkError. */
export async function apiRequest<T>(path: string, { method = "GET", body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if (signal?.aborted) throw cause
    throw new NetworkError({ cause })
  }

  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Not JSON (a proxy page, an empty body): keep only the status.
  }
  const { error, code } = isApiErrorBody(body) ? body : { error: `HTTP ${response.status}`, code: undefined }
  return new ApiError(response.status, error, code ?? null)
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.error === "string" && (candidate.code === undefined || typeof candidate.code === "string")
}
