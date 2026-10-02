import { MessageCircle } from "lucide-react"
import { Link } from "react-router"
import { useTranslation } from "react-i18next"
import type { PostPublic } from "@/api/types"
import { Button } from "@/components/ui/button"
import { formatPostDate } from "@/lib/format-date"
import { postUrl, type PostPageState } from "@/lib/paths"
import { cn } from "@/lib/utils"
import { UserAvatar } from "./user-avatar"

interface PostItemProps {
  post: PostPublic
  /** "list": in a timeline or a reply list, links to its own page. "detail": the post of a post page. */
  variant?: "list" | "detail"
}

export function PostItem({ post, variant = "list" }: PostItemProps) {
  const { t, i18n } = useTranslation()
  const inList = variant === "list"
  const url = postUrl(post.slug)
  const time = <time dateTime={post.createdAt}>{formatPostDate(post.createdAt, i18n.resolvedLanguage ?? i18n.language, t)}</time>
  const body =
    post.content === null ? (
      <p className="text-muted-foreground italic">{t("posts.deleted")}</p>
    ) : (
      <p className={cn("break-words whitespace-pre-wrap", !inList && "text-lg")}>{post.content}</p>
    )

  return (
    <article id={`post-${post.slug}`} className="flex gap-3 py-4">
      <UserAvatar user={post.author} />
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <span className="font-semibold">{post.author.displayName}</span>
          <span className="text-muted-foreground">@{post.author.username}</span>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          {inList ? (
            <Link to={url} className="text-muted-foreground hover:text-primary hover:underline">
              {time}
            </Link>
          ) : (
            <span className="text-muted-foreground">{time}</span>
          )}
        </header>

        {post.replyTo && (
          <p className="text-sm text-muted-foreground">
            <Link to={postUrl(post.replyTo.slug)} className="hover:text-primary hover:underline">
              {t("posts.replyTo", { username: post.replyTo.author.username })}
            </Link>
          </p>
        )}

        <div className="mt-1">
          {inList ? (
            // The time link above is the keyboard way in; the body is a larger click target for the same page.
            <Link to={url} tabIndex={-1} className="block">
              {body}
            </Link>
          ) : (
            body
          )}
        </div>

        {inList && (
          <div className="mt-1 -ml-2 flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to={url} state={{ reply: true } satisfies PostPageState}>
                <MessageCircle aria-hidden />
                {t("posts.reply")}
              </Link>
            </Button>
            {post.replyCount !== undefined && post.replyCount > 0 && (
              <span className="text-sm text-muted-foreground">{t("posts.replyCount", { count: post.replyCount })}</span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
