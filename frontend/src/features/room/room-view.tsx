import { useId } from "react"
import { useTranslation } from "react-i18next"
import { useCreatePost, useRoomPosts } from "@/api/queries"
import type { Room } from "@/api/types"
import { Card, CardContent } from "@/components/ui/card"
import { Composer } from "@/features/posts/composer"
import { PostList } from "@/features/posts/post-list"

/** A province or town room: composer on top, then the timeline of top-level posts. Replies live in each post's page. */
export function RoomView({ room }: { room: Room }) {
  const { t } = useTranslation()
  const headingId = useId()
  const createPost = useCreatePost(room)
  const posts = useRoomPosts(room)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <Composer kind="post" mutation={createPost} />
        </CardContent>
      </Card>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {t("posts.title")}
        </h2>
        <PostList query={posts} emptyText={t("posts.empty")} loadErrorText={t("posts.loadError")} />
      </section>
    </div>
  )
}
