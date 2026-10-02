import { screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { apiUrl } from "@/api/client"
import { renderRoute } from "@/test/render"
import { server } from "@/test/server"

describe("provinces screen", () => {
  it("lists the provinces from the API as links to their rooms", async () => {
    renderRoute("/")
    expect(screen.getByRole("heading", { level: 1, name: "Herrialdeak" })).toBeInTheDocument()

    const links = await screen.findAllByRole("link", { name: /Gipuzkoa|Bizkaia|Araba|Nafarroa|Lapurdi|Zuberoa/ })
    expect(links.map((link) => link.textContent)).toEqual([
      "Gipuzkoa",
      "Bizkaia",
      "Araba",
      "Nafarroa",
      "Lapurdi",
      "Nafarroa Beherea",
      "Zuberoa",
    ])
    expect(screen.getByRole("link", { name: "Nafarroa Beherea" })).toHaveAttribute("href", "/nafarroa-beherea")
  })

  it("shows a translated error, never the API text, and retries", async () => {
    server.use(
      http.get(apiUrl("/provinces"), () => HttpResponse.json({ error: "there was an error in the request" }, { status: 500 }), {
        once: true,
      }),
    )
    const { user } = renderRoute("/")

    expect(await screen.findByRole("alert")).toHaveTextContent("Zerbitzarian zerbaitek huts egin du. Saiatu berriro geroago.")
    expect(screen.queryByText(/there was an error/)).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Saiatu berriro" }))
    expect(await screen.findByRole("link", { name: "Gipuzkoa" })).toBeInTheDocument()
  })
})
