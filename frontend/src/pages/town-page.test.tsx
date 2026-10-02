import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/render"

describe("town screen", () => {
  it("shows the town name, a link back to its province and its room", async () => {
    renderRoute("/gipuzkoa/zarautz")
    expect(await screen.findByRole("heading", { level: 1, name: "Zarautz" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Gipuzkoa" })).toHaveAttribute("href", "/gipuzkoa")
    expect(screen.getByRole("textbox", { name: "Idatzi mezu bat" })).toBeInTheDocument()
  })

  it("shows the translated not-found state for a town that is not in the province", async () => {
    renderRoute("/gipuzkoa/bilbo")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
  })

  it("shows the translated not-found state when the province does not exist (404)", async () => {
    renderRoute("/asturias/gijon")
    expect(await screen.findByRole("heading", { level: 1, name: "Ez dugu hau aurkitu" })).toBeInTheDocument()
  })
})
