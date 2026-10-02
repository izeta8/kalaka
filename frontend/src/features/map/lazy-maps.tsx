import { lazy, Suspense, type ComponentProps } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// d3-geo, topojson and the map data load only on the screens that draw a map.
const HerrialdeakMapImpl = lazy(() => import("./herrialdeak-map").then((module) => ({ default: module.HerrialdeakMap })))
const TownsMapImpl = lazy(() => import("./towns-map").then((module) => ({ default: module.TownsMap })))

const fallback = <Skeleton className="aspect-[4/3] w-full" />

export function HerrialdeakMap(props: ComponentProps<typeof HerrialdeakMapImpl>) {
  return (
    <Suspense fallback={fallback}>
      <HerrialdeakMapImpl {...props} />
    </Suspense>
  )
}

export function TownsMap(props: ComponentProps<typeof TownsMapImpl>) {
  return (
    <Suspense fallback={fallback}>
      <TownsMapImpl {...props} />
    </Suspense>
  )
}
