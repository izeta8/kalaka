import { useId, useMemo, useState } from "react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import type { Town } from "@/api/types"
import { Input } from "@/components/ui/input"
import { normalizeForSearch } from "@/lib/search"

/** The accessible way to the towns: a searchable list under the map. */
export function TownSearch({ id, provinceSlug, towns }: { id: string; provinceSlug: string; towns: Town[] }) {
  const { t } = useTranslation()
  const listId = useId()
  const [query, setQuery] = useState("")

  const matches = useMemo(() => {
    const needle = normalizeForSearch(query)
    return needle ? towns.filter((town) => normalizeForSearch(town.name).includes(needle)) : towns
  }, [query, towns])

  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs">
      <label htmlFor={id} className="font-medium">
        {t("towns.search")}
      </label>
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("towns.searchPlaceholder")}
        aria-controls={listId}
        autoComplete="off"
      />
      <p role="status" className="text-sm text-muted-foreground">
        {matches.length === 0 ? t("towns.noMatch") : t("towns.count", { count: matches.length })}
      </p>
      <ul id={listId} aria-label={t("towns.title")} className="flex max-h-60 flex-wrap gap-2 overflow-y-auto">
        {matches.map((town) => (
          <li key={town.slug}>
            <Link
              to={`/${provinceSlug}/${town.slug}`}
              className="inline-block rounded-full border px-3 py-1 text-sm transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {town.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
