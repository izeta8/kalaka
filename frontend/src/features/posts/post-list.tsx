import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { PostPage } from "@/api/types"
import { ErrorState } from "@/components/feedback/error-state"
import { LoadingList } from "@/components/feedback/loading-list"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { errorKind, errorMessageKey } from "@/lib/error-message"
import { PostItem } from "./post-item"

interface PostListProps {
  query: UseInfiniteQueryResult<InfiniteData<PostPage>>
  /** Already translated. */
  emptyText: string
  /** Already translated; shown when the first page fails for any reason but the network. */
  loadErrorText: string
}

/** A paged list of posts, newest first, with "load more" through the cursor. */
export function PostList({ query, emptyText, loadErrorText }: PostListProps) {
  const { t } = useTranslation()

  if (query.isPending) return <LoadingList rows={3} className="h-20" />

  if (query.isLoadingError) {
    const message = errorKind(query.error) === "network" ? t(errorMessageKey(query.error, "load")) : loadErrorText
    return <ErrorState message={message} onRetry={() => void query.refetch()} />
  }

  const posts = query.data?.pages.flatMap((page) => page.posts) ?? []
  if (posts.length === 0) return <p className="py-6 text-center text-muted-foreground">{emptyText}</p>

  return (
    <div className="flex flex-col gap-3">
      <Card className="px-4">
        <ol className="divide-y">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostItem post={post} />
            </li>
          ))}
        </ol>
      </Card>
      {query.isFetchNextPageError && <ErrorState message={t(errorMessageKey(query.error, "load"))} />}
      {query.hasNextPage && (
        <Button variant="outline" className="self-center" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? t("status.loading") : t("posts.loadMore")}
        </Button>
      )}
    </div>
  )
}
