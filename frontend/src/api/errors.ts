/**
 * A non-2xx response from the API.
 * `message` is the API's `error` text: an English developer message. Never show it to users;
 * map `status` (and `code`, once the backend sends it) to a translated text instead.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

/** The request never got a response: offline, DNS, CORS rejection, server down. */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("the request did not reach the API", options)
    this.name = "NetworkError"
  }
}
