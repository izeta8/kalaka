import type { RouteObject } from "react-router"
import { RootLayout } from "@/components/layout/root-layout"
import { RouteError } from "@/components/layout/route-error"
import { NotFoundPage } from "@/pages/not-found-page"
import { PostPage } from "@/pages/post-page"
import { ProvincePage } from "@/pages/province-page"
import { ProvincesPage } from "@/pages/provinces-page"
import { TownPage } from "@/pages/town-page"

// SPEC.md section 6. "posts/:postSlug" is a static segment, so it wins over ":provinceSlug/:townSlug".
// Any other top-level path is read as a province slug.
export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: ProvincesPage },
      { path: ":provinceSlug", Component: ProvincePage },
      { path: ":provinceSlug/:townSlug", Component: TownPage },
      { path: "posts/:postSlug", Component: PostPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]
