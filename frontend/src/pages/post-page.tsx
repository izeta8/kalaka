import { useId } from "react"
import { useLocation, useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { useCreateReply, usePost, useReplies } from "@/api/queries"
import { Card, CardContent } from "@/components/ui/card"
import { Composer } from "@/features/posts/composer"
import { PostItem } from "@/features/posts/post-item"
import { PostList } from "@/features/posts/post-list"
import { roomUrl, type PostPageState } from "@/lib/paths"
import { BackLink, PageError, PageLoading } from "./page-parts"

/** A post, its reply composer and its direct replies (newest first). Each reply opens its own page. */
export function PostPage() {
  const { postSlug = "" } = useParams()
  return <Thread key={postSlug} postSlug={postSlug} />
}

function Thread({ postSlug }: { postSlug: string }) {
  const { t } = useTranslation()
  const headingId = useId()
  const state = useLocation().state as PostPageState | null
  const post = usePost(postSlug)
  const replies = useReplies(postSlug)
  const reply = useCreateReply(postSlug)

  if (post.isError) return <PageError error={post.error} onRetry={() => void post.refetch()} />
  if (post.isPending) return <PageLoading />

  // `room` is a PROPOSED field: without it there is no way back to the room but the browser's.
  const room = post.data.room

  return (
    <div className="flex flex-col gap-6">
      <title>{`${t("thread.title")} · ${t("app.name")}`}</title>
      {room && (
        <div>
          <BackLink to={roomUrl(room)}>{room.town?.name ?? room.province.name}</BackLink>
        </div>
      )}
      <Card className="px-4">
        <PostItem post={post.data} variant="detail" />
      </Card>
      <Card>
        <CardContent>
          <Composer kind="reply" mutation={reply} autoFocus={state?.reply === true} />
        </CardContent>
      </Card>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {t("thread.replies")}
        </h2>
        <PostList query={replies} emptyText={t("thread.empty")} loadErrorText={t("thread.loadError")} />
      </section>
    </div>
  )
}
