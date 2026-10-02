import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/render"

async function map(name: string) {
  const group = await screen.findByRole("group", { name })
  await within(group)
    .findAllByRole("link")
    .catch(() => [])
  return group
}

describe("maps", () => {
  it("draws the herrialdeak as links named after the provinces", async () => {
    renderRoute("/")
    const herrialdeak = await map("Euskal Herriko mapa")

    const links = await within(herrialdeak).findAllByRole("link")
    expect(links.map((link) => link.getAttribute("aria-label")).sort()).toEqual([
      "Araba",
      "Bizkaia",
      "Gipuzkoa",
      "Lapurdi",
      "Nafarroa",
      "Nafarroa Beherea",
      "Zuberoa",
    ])
    expect(within(herrialdeak).getByRole("link", { name: "Gipuzkoa" })).toHaveAttribute("href", "/gipuzkoa")
  })

  it("goes to the province when you click it", async () => {
    const { user, router } = renderRoute("/")
    const herrialdeak = await map("Euskal Herriko mapa")

    await user.click(await within(herrialdeak).findByRole("link", { name: "Bizkaia" }))
    expect(router.state.location.pathname).toBe("/bizkaia")
    expect(await screen.findByRole("heading", { level: 1, name: "Bizkaia" })).toBeInTheDocument()
  })

  it("goes to the town with the keyboard: Tab to the region, Enter", async () => {
    const { user, router } = renderRoute("/gipuzkoa")
    const towns = await map("Herrien mapa: Gipuzkoa")

    const zarautz = await within(towns).findByRole("link", { name: "Zarautz" })
    zarautz.focus()
    expect(zarautz).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(router.state.location.pathname).toBe("/gipuzkoa/zarautz")
    expect(await screen.findByRole("heading", { level: 1, name: "Zarautz" })).toBeInTheDocument()
  })

  it("links every municipality that has a town, and only those", async () => {
    const { container } = renderRoute("/gipuzkoa")
    const towns = await map("Herrien mapa: Gipuzkoa")

    expect(await within(towns).findAllByRole("link")).toHaveLength(88)
    // 88 municipalities + 2 pieces of shared land (not towns): drawn, not links.
    expect(container.querySelectorAll("svg[aria-label='Herrien mapa: Gipuzkoa'] path:not(.pointer-events-none)")).toHaveLength(90)
    expect(within(towns).queryByRole("link", { name: /Parzonería/ })).not.toBeInTheDocument()
  })

  it("draws the municipalities of a province without towns, none of them clickable", async () => {
    const { container } = renderRoute("/araba")
    const towns = await map("Herrien mapa: Araba")

    expect(within(towns).queryAllByRole("link")).toHaveLength(0)
    expect(container.querySelectorAll("svg[aria-label='Herrien mapa: Araba'] path").length).toBeGreaterThan(50)
  })

  it("shows the data attribution", async () => {
    renderRoute("/")
    expect(screen.getByText(/© IGN\/CNIG \(CC BY 4\.0\)/)).toBeInTheDocument()
  })
})
