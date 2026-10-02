import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "./errors"

const MAX_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx will not change by asking again; network errors and 5xx may.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false
          return failureCount < MAX_RETRIES
        },
      },
    },
  })
}
