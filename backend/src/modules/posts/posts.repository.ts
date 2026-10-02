import * as database from "../../shared/database/query.ts"
import type { PostInsert, PostRow } from "./posts.types.ts"

export const insertPost = async ({ slug, content, authorId, replyToId, roomId }: PostInsert): Promise<PostRow> => {
  const queryString = `
        INSERT INTO posts(slug, content, author_id, reply_to_id, room_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`

  const postRows = await database.query<PostRow>(queryString, [slug, content, authorId, replyToId, roomId])

  if (postRows.length === 0) {
    throw new Error(`there was an error inserting the post (slug: ${slug}, authorId: ${authorId}, roomId: ${roomId})`)
  }

  return postRows[0]
}

// null when the post does not exist or was already deleted: the condition lives in the UPDATE, so there is no check-then-act race
export const softDeletePost = async (slug: string): Promise<PostRow | null> => {
  const queryString = `
        UPDATE posts
        SET deleted_at = now()
        WHERE slug = $1
        AND deleted_at IS NULL
        RETURNING *`

  const updatedRows = await database.query<PostRow>(queryString, [slug])

  return updatedRows.length > 0 ? updatedRows[0] : null
}

export const findPostBySlug = async (slug: string): Promise<PostRow | null> => {
  const queryString = `
        SELECT *
        FROM posts
        WHERE slug = $1`

  const postRows = await database.query<PostRow>(queryString, [slug])
  return postRows.length > 0 ? postRows[0] : null
}
