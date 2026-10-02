import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query"
import { createPost, createReply, getPost, getProvinces, getReplies, getRoomPosts, getTowns } from "./endpoints"
import type { NewPost, PostPage, PostPublic, Room } from "./types"

type Pages = InfiniteData<PostPage, string | undefined>

export const queryKeys = {
  provinces: ["provinces"] as const,
  towns: (provinceSlug: string) => ["provinces", provinceSlug, "towns"] as const,
  roomPosts: ({ provinceSlug, townSlug }: Room) => ["rooms", provinceSlug, townSlug ?? null, "posts"] as const,
  post: (postSlug: string) => ["posts", postSlug] as const,
  replies: (postSlug: string) => ["posts", postSlug, "replies"] as const,
}

export function useProvinces() {
  return useQuery({
    queryKey: queryKeys.provinces,
    queryFn: ({ signal }) => getProvinces(signal),
    staleTime: Infinity, // The list of provinces does not change while the app is open.
  })
}

export function useTowns(provinceSlug: string) {
  return useQuery({
    queryKey: queryKeys.towns(provinceSlug),
    queryFn: ({ signal }) => getTowns(provinceSlug, signal),
    staleTime: Infinity,
  })
}

const nextCursor = (lastPage: PostPage) => lastPage.nextCursor ?? undefined

/** A room's top-level posts, newest first, one page per cursor. PROPOSED contract (backend issue). */
export function useRoomPosts(room: Room) {
  return useInfiniteQuery({
    queryKey: queryKeys.roomPosts(room),
    queryFn: ({ pageParam, signal }) => getRoomPosts(room, { before: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
  })
}

/** PROPOSED contract (backend issue). */
export function usePost(postSlug: string) {
  return useQuery({
    queryKey: queryKeys.post(postSlug),
    queryFn: ({ signal }) => getPost(postSlug, signal),
  })
}

/** A post's direct replies, newest first. PROPOSED contract (backend issue). */
export function useReplies(postSlug: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.replies(postSlug),
    queryFn: ({ pageParam, signal }) => getReplies(postSlug, { before: pageParam, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor,
  })
}

export function useCreatePost(room: Room) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: NewPost) => createPost(room, post),
    onSuccess: (created) => prependToList(queryClient, queryKeys.roomPosts(room), created),
  })
}

export function useCreateReply(postSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (post: NewPost) => createReply(postSlug, post),
    onSuccess: (created) => {
      prependToList(queryClient, queryKeys.replies(postSlug), created)
      bumpReplyCount(queryClient, postSlug)
    },
  })
}

/**
 * Puts a new post at the top of a loaded list instead of refetching: refetching every page
 * would shift the page boundaries and could hide a post between two pages.
 */
function prependToList(queryClient: QueryClient, key: readonly unknown[], post: PostPublic) {
  const current = queryClient.getQueryData<Pages>(key)
  if (!current || current.pages.length === 0) {
    void queryClient.invalidateQueries({ queryKey: key })
    return
  }
  const [first, ...rest] = current.pages
  queryClient.setQueryData<Pages>(key, { ...current, pages: [{ ...first, posts: [post, ...first.posts] }, ...rest] })
}

/** Adds one to the post's reply count wherever it is cached (its page, room timelines, reply lists). */
function bumpReplyCount(queryClient: QueryClient, postSlug: string) {
  const bump = (post: PostPublic): PostPublic =>
    post.slug === postSlug && post.replyCount !== undefined ? { ...post, replyCount: post.replyCount + 1 } : post
  const bumpPages = (data: Pages | undefined) =>
    data && { ...data, pages: data.pages.map((page) => ({ ...page, posts: page.posts.map(bump) })) }

  queryClient.setQueryData<PostPublic>(queryKeys.post(postSlug), (post) => post && bump(post))
  queryClient.setQueriesData<Pages>({ queryKey: ["rooms"] }, bumpPages)
  queryClient.setQueriesData<Pages>({ predicate: (query) => query.queryKey[0] === "posts" && query.queryKey[2] === "replies" }, bumpPages)
}
