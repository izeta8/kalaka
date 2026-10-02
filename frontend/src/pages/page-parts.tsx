import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import { ErrorState } from "@/components/feedback/error-state"
import { NotFoundState } from "@/components/feedback/not-found-state"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessageKey, isMissingPage } from "@/lib/error-message"

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded-sm text-sm text-primary hover:underline">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  )
}

export function PageLoading() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t("status.loading")}</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-28" />
    </div>
  )
}

/** A failed page load: not-found for unknown or invalid slugs, a translated error with retry otherwise. */
export function PageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation()
  if (isMissingPage(error)) return <NotFoundState />
  return <ErrorState message={t(errorMessageKey(error, "load"))} onRetry={onRetry} />
}
