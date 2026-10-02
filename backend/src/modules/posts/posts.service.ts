import { customAlphabet } from "nanoid"
import { DatabaseError } from "pg"
import * as townsService from "../towns/towns.service.ts"
import { findUserById } from "../users/users.repository.ts"
import * as usersService from "../users/users.service.ts"
import type { UserRow } from "../users/users.types.ts"
import { findPostBySlug, insertPost } from "./posts.repository.ts"
import type { PostInsert, PostPublic, PostReference, PostRow } from "./posts.types.ts"

type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

export const publishPost = async (
  content: string,
  replyToPostSlug: string,
  townSlug: string,
  authorId: number,
): Promise<Result<PostPublic, "author-not-found" | "town-not-found" | "reply-to-not-found">> => {
  // Check if the room exists
  const author = await findUserById(authorId)
  if (author === null) {
    return { ok: false, error: "author-not-found" }
  }
  // The authentication will be implemented soon. We are just mocking insecurely...

  // Check if town exists, if so, link the roomId of the town with the post
  const town = await townsService.getTownBySlug(townSlug)
  if (town === null) {
    return { ok: false, error: "town-not-found" }
  }

  // If replyTo is not empty, check if the post exists and add to the insert object
  let replyToPost: PostRow | null = null
  if (replyToPostSlug !== null) {
    replyToPost = await findPostBySlug(replyToPostSlug)
    if (replyToPost === null) {
      return { ok: false, error: "reply-to-not-found" }
    }
  }

  const postInsertData: Omit<PostInsert, "slug"> = {
    content: content,
    authorId: authorId,
    roomId: town.roomId,
    replyToId: replyToPost?.id || null,
  }

  const post = await idkthename(postInsertData)

  const postPublic = privateToPublicPost(post, author, replyToPost)

  return { ok: true, value: postPublic }
}

export const privateToPublicPost = (
  privatePost: PostRow,
  privateAuthor: UserRow,
  replyPost: PostRow | null,
  replyPostAuthor: UserRow | null,
): PostPublic => {
  const publicAuthor = usersService.privateToPublicUser(privateAuthor)

  const postReference: PostReference | null =
    replyPost && replyPostAuthor
      ? {
          slug: replyPost.slug,
          author: replyPostAuthor,
        }
      : null

  return {
    slug: privatePost.slug,
    content: privatePost.content,
    author: publicAuthor,
    replyTo: postReference,
    createdAt: privatePost.createdAt,
    deletedAt: privatePost.deletedAt,
  }
}

export const idkthename = async (postData: Omit<PostInsert, "slug">): Promise<PostRow> => {
  const MAX_RETRIES = 4
  let currentTries = 0
  let insertedPost: PostRow | undefined

  // Why retry 4 times if post slug collides with an existing one (is a UNIQUE field)
  while (!insertedPost || currentTries >= MAX_RETRIES) {
    try {
      const slug = generatePostSlug()
      const postToInsert: PostInsert = { ...postData, slug }
      insertedPost = await insertPost(postToInsert)
    } catch (error) {
      if (error instanceof DatabaseError && error.constraint === "posts_slug_key") {
        // If reached here, the slug has collided with a existing post. So we retry
        console.log(`slug has collided with an existing post when inserting a new post. (what info would you put here?)`) // como puedo poner el slug aqui? lo deberia meter en el error que lanza insertPost()? o deberia sacar la variable slug fuera del scope del try-catch? y deberia poner la variable retries?
        currentTries++
      }
    }
  }

  return insertedPost
}

export const generatePostSlug = (): string => {
  const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz1234567890", 10)
  return nanoid(10)
}
