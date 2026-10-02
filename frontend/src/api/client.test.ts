import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { server } from "@/test/server"
import { apiRequest, apiUrl } from "./client"
import { createPost, getTowns } from "./endpoints"
import { ApiError, NetworkError } from "./errors"

describe("apiRequest", () => {
  it("resolves with the JSON body of a 2xx response", async () => {
    await expect(getTowns("gipuzkoa")).resolves.toContainEqual({ slug: "zarautz", name: "Zarautz" })
  })

  it("turns a 404 into an ApiError with the status and the body's error", async () => {
    const error = await getTowns("asturias").catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: "there is no such province 'asturias'", code: null })
  })

  it("turns a 400 into an ApiError", async () => {
    await expect(getTowns("Gipuzkoa")).rejects.toMatchObject({ status: 400, message: "the slug must be a valid province name slug" })
  })

  it("keeps the error code when the API sends one", async () => {
    server.use(http.get(apiUrl("/provinces"), () => HttpResponse.json({ error: "slow down", code: "RATE_LIMITED" }, { status: 429 })))
    await expect(apiRequest("/provinces")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" })
  })

  it("keeps the status when the error body is not JSON", async () => {
    server.use(http.get(apiUrl("/provinces"), () => new HttpResponse("<h1>Bad gateway</h1>", { status: 502 })))
    const error = await apiRequest("/provinces").catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, message: "HTTP 502" })
  })

  it("turns a failed fetch into a NetworkError", async () => {
    server.use(http.get(apiUrl("/provinces"), () => HttpResponse.error()))
    await expect(apiRequest("/provinces")).rejects.toBeInstanceOf(NetworkError)
  })

  it("sends a JSON body with only the content", async () => {
    let received: unknown
    server.use(
      http.post(apiUrl("/provinces/gipuzkoa/posts"), async ({ request }) => {
        received = { contentType: request.headers.get("content-type"), body: await request.json() }
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    await createPost({ provinceSlug: "gipuzkoa" }, { content: "Kaixo" })
    expect(received).toEqual({ contentType: "application/json", body: { content: "Kaixo" } })
  })
})
