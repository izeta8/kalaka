import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/render"

describe("site header", () => {
  it("switches the language: texts, <html lang> and the stored choice", async () => {
    const { user } = renderRoute("/")
    expect(screen.getByRole("heading", { level: 1, name: "Herrialdeak" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Euskara" })).toHaveAttribute("aria-pressed", "true")

    await user.click(screen.getByRole("button", { name: "Español" }))

    expect(screen.getByRole("heading", { level: 1, name: "Provincias" })).toBeInTheDocument()
    expect(screen.getByText("Elige tu provincia y empieza a charlar.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true")
    expect(document.documentElement.lang).toBe("es")
    expect(window.localStorage.getItem("kalaka.language")).toBe("es")
  })

  it("cycles the theme system → light → dark and remembers it", async () => {
    const { user } = renderRoute("/")
    const html = document.documentElement

    await user.click(screen.getByRole("button", { name: "Itxura: sistemarena. Sakatu aldatzeko." }))
    expect(html).not.toHaveClass("dark")
    expect(window.localStorage.getItem("kalaka.theme")).toBe("light")

    await user.click(screen.getByRole("button", { name: "Itxura: argia. Sakatu aldatzeko." }))
    expect(html).toHaveClass("dark")
    expect(window.localStorage.getItem("kalaka.theme")).toBe("dark")

    await user.click(screen.getByRole("button", { name: "Itxura: iluna. Sakatu aldatzeko." }))
    expect(html).not.toHaveClass("dark")
    expect(window.localStorage.getItem("kalaka.theme")).toBe("system")
  })
})
