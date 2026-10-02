import type { PostRoom } from "@/api/types"

export function postUrl(postSlug: string): string {
  return `/posts/${postSlug}`
}

export function roomUrl({ province, town }: PostRoom): string {
  return town ? `/${province.slug}/${town.slug}` : `/${province.slug}`
}

/** Router state that asks the post page to focus its reply composer. */
export interface PostPageState {
  reply?: boolean
}
