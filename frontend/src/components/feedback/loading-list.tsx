import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder rows while a list loads; announced once to screen readers. */
export function LoadingList({ rows = 4, className = "h-12" }: { rows?: number; className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{t("status.loading")}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  )
}
