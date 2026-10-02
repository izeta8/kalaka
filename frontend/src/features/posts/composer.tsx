import type { UseMutationResult } from "@tanstack/react-query"
import { useId, useState, type FormEvent, type KeyboardEvent } from "react"
import { useTranslation } from "react-i18next"
import { POST_CONTENT_MAX_LENGTH, type NewPost, type PostPublic } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { errorMessageKey } from "@/lib/error-message"
import { cn } from "@/lib/utils"

const TEXTS = {
  post: {
    label: "composer.label",
    placeholder: "composer.placeholder",
    submit: "composer.publish",
    done: "composer.published",
    errors: "publish",
  },
  reply: {
    label: "composer.replyLabel",
    placeholder: "composer.replyPlaceholder",
    submit: "composer.reply",
    done: "composer.replied",
    errors: "reply",
  },
} as const

interface ComposerProps {
  kind: keyof typeof TEXTS
  mutation: UseMutationResult<PostPublic, Error, NewPost>
  onPublished?: (post: PostPublic) => void
  onCancel?: () => void
  autoFocus?: boolean
}

/** Text box for a new post or a reply. Validates like the API: 1–500 characters after trimming. */
export function Composer({ kind, mutation, onPublished, onCancel, autoFocus }: ComposerProps) {
  const { t } = useTranslation()
  const id = useId()
  const [value, setValue] = useState("")
  const texts = TEXTS[kind]

  const length = value.trim().length
  const tooLong = length > POST_CONTENT_MAX_LENGTH
  const canSubmit = length > 0 && !tooLong && !mutation.isPending

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSubmit) return
    mutation.mutate(
      { content: value.trim() },
      {
        onSuccess: (post) => {
          setValue("")
          onPublished?.(post)
        },
      },
    )
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit()
  }

  function onChange(next: string) {
    setValue(next)
    if (mutation.isError || mutation.isSuccess) mutation.reset()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        {t(texts.label)}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t(texts.placeholder)}
        aria-invalid={tooLong || undefined}
        aria-describedby={`${id}-counter`}
        autoFocus={autoFocus}
        rows={kind === "post" ? 3 : 2}
        className="resize-none bg-card"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-counter`} className={cn("text-xs text-muted-foreground", tooLong && "text-destructive")}>
          {tooLong
            ? t("composer.tooLong", { max: POST_CONTENT_MAX_LENGTH })
            : t("composer.counter", { count: length, max: POST_CONTENT_MAX_LENGTH })}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {t("composer.cancel")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {t(texts.submit)}
          </Button>
        </div>
      </div>
      <div aria-live="polite" className="text-sm empty:hidden">
        {mutation.isError && (
          <p className="text-destructive">{t(errorMessageKey(mutation.error, texts.errors), { max: POST_CONTENT_MAX_LENGTH })}</p>
        )}
        {mutation.isSuccess && <p className="text-primary">{t(texts.done)}</p>}
      </div>
    </form>
  )
}
