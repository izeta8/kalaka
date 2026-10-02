import { customAlphabet } from "nanoid"
import { DatabaseError } from "pg"
import * as provincesRepository from "../provinces/provinces.repository.ts"
import * as townsRepository from "../towns/towns.repository.ts"
import * as usersRepository from "../users/users.repository.ts"
import * as usersService from "../users/users.service.ts"
import type { UserRow } from "../users/users.types.ts"
import * as postsRepository from "./posts.repository.ts"
import type { PostInsert, PostPublic, PostReference, PostRequestData, PostRow } from "./posts.types.ts"

export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

export type PublishPostError = "author-not-found" | "province-not-found" | "town-not-found" | "reply-to-not-found"

// What the route passes to the service: the validated body plus who is posting
export type NewPost = PostRequestData & { authorId: number }

// How many random slugs to try when creating a post before giving up.
// Each collision with an existing post slug uses one attempt.
const MAX_POST_SLUG_ATTEMPTS = 4

// Post slugs: 10 random characters of a-z0-9 (posts_slug_format in the database)
const POST_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"
const POST_SLUG_LENGTH = 10
const generatePostSlug = customAlphabet(POST_SLUG_ALPHABET, POST_SLUG_LENGTH)

export const publishPostInTown = async (
  provinceSlug: string,
  townSlug: string,
  newPost: NewPost,
): Promise<Result<PostPublic, PublishPostError>> => {
  // A town slug is only unique inside its province, so both slugs are needed to find the town
  const town = await townsRepository.findTownBySlugs(provinceSlug, townSlug)
  if (town === null) {
    return { ok: false, error: "town-not-found" }
  }

  return publishPostInRoom(town.roomId, newPost)
}

export const publishPostInProvince = async (provinceSlug: string, newPost: NewPost): Promise<Result<PostPublic, PublishPostError>> => {
  const province = await provincesRepository.findProvinceBySlug(provinceSlug)
  if (province === null) {
    return { ok: false, error: "province-not-found" }
  }

  return publishPostInRoom(province.roomId, newPost)
}

// Common part of publishing: the caller has already resolved the room of the town or province
const publishPostInRoom = async (
  roomId: number,
  { authorId, content, replyToPostSlug }: NewPost,
): Promise<Result<PostPublic, PublishPostError>> => {
  // The authentication will be implemented soon. We are just mocking insecurely...
  const author = await usersRepository.findUserById(authorId)
  if (author === null) {
    return { ok: false, error: "author-not-found" }
  }

  // If replyTo is not empty, check if the post exists and add to the insert object
  let replyToPost: PostRow | null = null
  if (replyToPostSlug !== null) {
    replyToPost = await postsRepository.findPostBySlug(replyToPostSlug)
    if (replyToPost === null) {
      return { ok: false, error: "reply-to-not-found" }
    }
  }

  const postInsertData: Omit<PostInsert, "slug"> = {
    content: content,
    authorId: authorId,
    roomId: roomId,
    replyToId: replyToPost?.id || null,
  }

  const post = await createPostWithUniqueSlug(postInsertData)

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

// Retries only when the random slug collides with an existing one. Any other error is not fixed by retrying.
const createPostWithUniqueSlug = async (postData: Omit<PostInsert, "slug">): Promise<PostRow> => {
  for (let attempt = 1; attempt <= MAX_POST_SLUG_ATTEMPTS; attempt++) {
    const slug = generatePostSlug()

    try {
      return await postsRepository.insertPost({ ...postData, slug })
    } catch (error) {
      const isSlugCollision = error instanceof DatabaseError && error.code === "23505" && error.constraint === "posts_slug_key"
      if (!isSlugCollision) {
        throw error
      }

      console.warn(`post slug collision (slug: ${slug}, attempt ${attempt} of ${MAX_POST_SLUG_ATTEMPTS})`)
    }
  }

  throw new Error(`could not generate a unique post slug after ${MAX_POST_SLUG_ATTEMPTS} attempts`)
}
