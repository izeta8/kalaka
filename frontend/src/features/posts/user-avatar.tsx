import type { UserPublic } from "@/api/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("")
}

/** Circle with the picture, or the initials on the sand accent while it loads or if it fails. */
export function UserAvatar({ user }: { user: Pick<UserPublic, "displayName" | "avatarUrl"> }) {
  return (
    <Avatar aria-hidden>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
    </Avatar>
  )
}
