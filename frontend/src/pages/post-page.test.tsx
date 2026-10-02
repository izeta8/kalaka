import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { PostPublic } from "@/api/types"
import { roomPosts } from "@/mocks/db"
import { renderRoute } from "@/test/render"

function seedPost(room: string, match: (post: PostPublic) => boolean): PostPublic {
  const post = roomPosts(room).find(match)
  if (!post) throw new Error("seed post not found")
  return post
}

async function replies() {
  const heading = await screen.findByRole("heading", { level: 2, name: "Erantzunak" })
  return heading.closest("section")!
}

describe("post page", () => {
  it("shows the post, a link to its room and its direct replies, newest first", async () => {
    const post = seedPost("gipuzkoa", (candidate) => candidate.content === "Larunbatean mendi irteera Txindokira. Nor dator?")
    renderRoute(`/posts/${post.slug}`)

    expect(await screen.findByText("Larunbatean mendi irteera Txindokira. Nor dator?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Gipuzkoa" })).toHaveAttribute("href", "/gipuzkoa")

    const section = await replies()
    const items = await within(section).findAllByRole("article")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Ni ere bai, eguraldiak laguntzen badu.")
    expect(items[1]).toHaveTextContent("Ni bai! Zer ordutan?")
    expect(items[1]).toHaveTextContent("1 erantzun")
    expect(within(section).queryByText("Goizeko 7etan, Amezketako plazan.")).not.toBeInTheDocument() // not a direct reply
  })

  it("goes deeper: a reply opens its own page, which links back to its parent", async () => {
    const post = seedPost("gipuzkoa", (candidate) => candidate.content === "Larunbatean mendi irteera Txindokira. Nor dator?")
    const { user } = renderRoute(`/posts/${post.slug}`)
    const section = await replies()

    await user.click(await within(section).findByRole("link", { name: "Ni bai! Zer ordutan?" }))

    expect(await within(await replies()).findByText("Goizeko 7etan, Amezketako plazan.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Honi erantzuten: @jonander" })).toHaveAttribute("href", `/posts/${post.slug}`)
  })

  it("adds a new reply at the top of the list", async () => {
    const post = seedPost("gipuzkoa/zarautz", (candidate) => candidate.content === "Malekoian paseo bat egiteko eguna.")
    const { user } = renderRoute(`/posts/${post.slug}`)
    const section = await replies()
    await within(section).findAllByRole("article")

    await user.type(screen.getByRole("textbox", { name: "Idatzi erantzun bat" }), "Bihar arratsaldean bai!")
    await user.click(screen.getByRole("button", { name: "Erantzun" }))

    expect(await screen.findByText("Erantzunda!")).toBeInTheDocument()
    const items = within(section).getAllByRole("article")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Bihar arratsaldean bai!")
    expect(items[0]).toHaveTextContent("Honi erantzuten: @test")
  })

  it("counts the new reply when you go back to the room", async () => {
    const { user } = renderRoute("/gipuzkoa/zarautz")
    const surf = (await screen.findByText("Gaur olatu onak daude hondartzan. Surflariek pozik!")).closest("article")!
    expect(surf).toHaveTextContent("2 erantzun")

    await user.click(within(surf).getByRole("link", { name: "Erantzun" }))
    await user.type(await screen.findByRole("textbox", { name: "Idatzi erantzun bat" }), "Ni ere bai!")
    await user.click(screen.getByRole("button", { name: "Erantzun" }))
    await screen.findByText("Erantzunda!")
    await user.click(screen.getByRole("link", { name: "Zarautz" }))

    const updated = (await screen.findByText("Gaur olatu onak daude hondartzan. Surflariek pozik!")).closest("article")!
    expect(updated).toHaveTextContent("3 erantzun")
  })

  it("lets you reply to a deleted post", async () => {
    const deleted = seedPost("gipuzkoa/zarautz", (candidate) => candidate.content === null)
    const { user } = renderRoute(`/posts/${deleted.slug}`)

    expect(await screen.findByText("Mezu hau ezabatu egin da.")).toBeInTheDocument()
    expect(screen.getByText("Miren Etxeberria")).toBeInTheDocument()
    expect(await within(await replies()).findByText("Oraindik ez dago erantzunik. Erantzun zuk lehena!")).toBeInTheDocument()

    await user.type(screen.getByRole("textbox", { name: "Idatzi erantzun bat" }), "Zer zen?")
    await user.click(screen.getByRole("button", { name: "Erantzun" }))
    expect(await within(await replies()).findByText("Zer zen?")).toBeInTheDocument()
  })

  it("shows the translated not-found state for an unknown post (404) and an invalid slug (400)", async () => {
    const { unmount } = renderRoute("/posts/zzzzzzzzzz")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
    expect(screen.queryByText(/does not exist/)).not.toBeInTheDocument()
    unmount()

    renderRoute("/posts/Not-A-Slug")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
  })
})
