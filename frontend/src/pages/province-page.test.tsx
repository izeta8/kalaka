import { screen, within } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { apiUrl } from "@/api/client"
import { renderRoute } from "@/test/render"
import { server } from "@/test/server"

describe("province screen", () => {
  it("shows the province name, its towns and its room", async () => {
    renderRoute("/gipuzkoa")

    expect(await screen.findByRole("heading", { level: 1, name: "Gipuzkoa" })).toBeInTheDocument()
    const towns = screen.getByRole("list", { name: "Herriak" })
    expect(within(towns).getAllByRole("link")).toHaveLength(88)
    expect(within(towns).getByRole("link", { name: "Zarautz" })).toHaveAttribute("href", "/gipuzkoa/zarautz")
    expect(screen.getByRole("textbox", { name: "Idatzi mezu bat" })).toBeInTheDocument()
  })

  it("filters the towns list as you type, ignoring accents", async () => {
    const { user } = renderRoute("/gipuzkoa")
    const search = await screen.findByRole("searchbox", { name: "Bilatu herria" })
    const towns = screen.getByRole("list", { name: "Herriak" })

    await user.type(search, "onati")
    expect(
      within(towns)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Oñati"])
    expect(screen.getByText("1 herri")).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "zarau")
    expect(
      within(towns)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Zarautz"])

    await user.type(search, "xyz")
    expect(within(towns).queryAllByRole("link")).toHaveLength(0)
    expect(screen.getByText("Ez dago izen hori duen herririk.")).toBeInTheDocument()
  })

  it("shows the translated not-found state for an unknown province (404)", async () => {
    renderRoute("/asturias")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Joan hasierara" })).toHaveAttribute("href", "/")
    expect(screen.queryByText(/there is no such province/)).not.toBeInTheDocument()
  })

  it("shows the not-found state for a slug the API rejects (400)", async () => {
    renderRoute("/Gipuzkoa")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
  })

  it("says so when a province has no towns", async () => {
    renderRoute("/araba")
    expect(await screen.findByText("Herrialde honek ez du herririk oraindik.")).toBeInTheDocument()
  })

  it("shows a translated network error with retry", async () => {
    server.use(http.get(apiUrl("/provinces/:provinceSlug/towns"), () => HttpResponse.error()))
    renderRoute("/gipuzkoa")
    expect(await screen.findByRole("alert")).toHaveTextContent("Ezin izan da zerbitzarira konektatu.")
    expect(screen.getByRole("button", { name: "Saiatu berriro" })).toBeInTheDocument()
  })
})
