import * as database from "../../shared/database/query.ts"
import type { PostInsert, PostRow } from "./posts.types.ts"

export const insertPost = async ({ slug, content, authorId, replyToId, roomId }: PostInsert): Promise<PostRow> => {
  const queryString = `
        INSERT INTO posts(slug, content, author_id, reply_to_id, room_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`

  const postRows = await database.query<PostRow>(queryString, [slug, content, authorId, replyToId, roomId])

  if (postRows.length === 0) {
    throw new Error(`there was an error inserting the post (slug: ${slug}, authorId: ${authorId}, roomId: ${roomId})`)
  }

  return postRows[0]
}

export const findPostBySlug = async (slug: string): Promise<PostRow[]> => {
  const queryString = `
        SELECT *
        FROM posts
        WHERE slug = $1`

  return await database.query<PostRow>(queryString, [slug])
}
