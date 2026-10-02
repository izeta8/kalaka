import { screen, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { apiUrl } from "@/api/client"
import { renderRoute } from "@/test/render"
import { server } from "@/test/server"

async function timeline() {
  const heading = await screen.findByRole("heading", { level: 2, name: "Mezuak" })
  const section = heading.closest("section")!
  await within(section).findAllByRole("article")
  return section
}

function articleWith(container: HTMLElement, text: string) {
  return within(container).getByText(text).closest("article")!
}

describe("room", () => {
  it("lists only the top-level posts, newest first, and loads older ones with the cursor", async () => {
    const { user } = renderRoute("/gipuzkoa")
    const section = await timeline()

    const firstPage = within(section).getAllByRole("article")
    expect(firstPage).toHaveLength(20)
    expect(firstPage[0]).toHaveTextContent("Euria ari du berriro. Aterkia ez ahaztu!")
    expect(firstPage[0]).toHaveTextContent("Maite Sarasola")
    expect(firstPage[0]).toHaveTextContent("@maite")
    expect(within(section).queryByText("Ni! Hamar minututan plazan.")).not.toBeInTheDocument() // a reply

    await user.click(screen.getByRole("button", { name: "Kargatu gehiago" }))
    expect(await within(section).findByText("Kaixo! Berria naiz hemen.")).toBeInTheDocument()
    expect(within(section).getAllByRole("article")).toHaveLength(24)
    expect(screen.queryByRole("button", { name: "Kargatu gehiago" })).not.toBeInTheDocument()
  })

  it("links every post to its page and shows its reply count", async () => {
    renderRoute("/gipuzkoa")
    const section = await timeline()

    const post = articleWith(section, "Kafe bat hartzera noa. Norbait?")
    expect(post).toHaveTextContent("2 erantzun")
    const page = within(post).getByRole("link", { name: "Kafe bat hartzera noa. Norbait?" }).getAttribute("href")
    expect(page).toMatch(/^\/posts\/[a-z0-9]{10}$/)
    expect(within(post).getByRole("link", { name: "Erantzun" })).toHaveAttribute("href", page)
  })

  it("shows a deleted post with a placeholder, its author and the reply action", async () => {
    renderRoute("/gipuzkoa/zarautz")
    const section = await timeline()

    const deleted = articleWith(section, "Mezu hau ezabatu egin da.")
    expect(deleted).toHaveTextContent("Miren Etxeberria")
    expect(within(deleted).getByRole("link", { name: "Erantzun" })).toBeInTheDocument()
  })

  it("opens the post page with the reply box focused when you press reply", async () => {
    const { user, router } = renderRoute("/gipuzkoa/zarautz")
    const section = await timeline()

    await user.click(within(articleWith(section, "Malekoian paseo bat egiteko eguna.")).getByRole("link", { name: "Erantzun" }))

    expect(await screen.findByRole("heading", { level: 2, name: "Erantzunak" })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/posts\//)
    expect(screen.getByRole("textbox", { name: "Idatzi erantzun bat" })).toHaveFocus()
  })

  it("shows an empty room", async () => {
    renderRoute("/gipuzkoa/tolosa")
    expect(await screen.findByText("Oraindik ez dago mezurik. Idatzi lehena!")).toBeInTheDocument()
  })

  it("publishes a post and puts it at the top of the list", async () => {
    const { user } = renderRoute("/gipuzkoa/zarautz")
    const section = await timeline()

    await user.type(screen.getByRole("textbox", { name: "Idatzi mezu bat" }), "  Kaixo Zarautz!  ")
    expect(screen.getByText("14 / 500")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Argitaratu" }))

    expect(await screen.findByText("Argitaratuta!")).toBeInTheDocument()
    expect(within(section).getAllByRole("article")[0]).toHaveTextContent("Kaixo Zarautz!")
    expect(within(section).getAllByRole("article")[0]).toHaveTextContent("@test")
    expect(screen.getByRole("textbox", { name: "Idatzi mezu bat" })).toHaveValue("")
  })

  it("does not let an empty or too long post go out", async () => {
    const { user } = renderRoute("/gipuzkoa/zarautz")
    await timeline()
    const box = screen.getByRole("textbox", { name: "Idatzi mezu bat" })
    const publish = screen.getByRole("button", { name: "Argitaratu" })

    expect(publish).toBeDisabled()
    await user.type(box, "   ")
    expect(publish).toBeDisabled()

    await user.click(box)
    await user.paste("a".repeat(501))
    expect(screen.getByText("Luzeegia: gehienez 500 karaktere.")).toBeInTheDocument()
    expect(publish).toBeDisabled()
  })

  it("shows a translated error when publishing fails", async () => {
    server.use(
      http.post(apiUrl("/provinces/:provinceSlug/towns/:townSlug/posts"), () => HttpResponse.json({ error: "x" }, { status: 500 })),
    )
    const { user } = renderRoute("/gipuzkoa/zarautz")
    await timeline()

    await user.type(screen.getByRole("textbox", { name: "Idatzi mezu bat" }), "Kaixo")
    await user.click(screen.getByRole("button", { name: "Argitaratu" }))
    expect(await screen.findByText("Ezin izan da argitaratu. Saiatu berriro.")).toBeInTheDocument()
  })

  it("shows a friendly error with retry when the posts cannot be loaded", async () => {
    server.use(
      http.get(apiUrl("/provinces/:provinceSlug/posts"), () => HttpResponse.json({ error: "sorry, can't find that!" }, { status: 404 })),
    )
    renderRoute("/bizkaia")
    expect(await screen.findByText("Ezin izan dira mezuak kargatu.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Saiatu berriro" })).toBeInTheDocument()
    expect(screen.queryByText(/can't find/)).not.toBeInTheDocument()
  })
})
