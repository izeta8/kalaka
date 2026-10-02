import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/theme/theme-provider"

export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}
