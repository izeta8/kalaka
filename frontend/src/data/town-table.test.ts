/// <reference types="node" />
import { readFileSync } from "node:fs"
import path from "node:path"
import { geoArea } from "d3-geo"
import { describe, expect, it } from "vitest"
import { loadMap } from "@/features/map/map-data"
import { townMunicipalities } from "./town-table"

// The API seed, read-only: every town in it must have exactly one polygon on the map.
const SEED = path.resolve(process.cwd(), "../postgres/initdb")
const provinceById = Object.fromEntries(
  [...readFileSync(path.join(SEED, "03-provinces.sql"), "utf8").matchAll(/VALUES \((\d+), '([^']*)'/g)].map((match) => [
    match[1],
    match[2],
  ]),
)
const seedTowns = [
  ...readFileSync(path.join(SEED, "04-towns.sql"), "utf8").matchAll(/VALUES \((\d+), '((?:[^']|'')*)', '(?:[^']|'')*', (\d+),/g),
].map((match) => ({ slug: match[2], province: provinceById[match[3]] }))
const provinces = Object.values(provinceById)

describe("town ↔ municipality table", () => {
  it("reads the seed", () => {
    expect(seedTowns.length).toBeGreaterThan(0)
  })

  it.each(provinces)("gives every seed town of %s exactly one polygon of its map", async (province) => {
    const towns = seedTowns.filter((town) => town.province === province)
    const table = townMunicipalities(province)
    expect(table.map((entry) => entry.slug).sort()).toEqual(towns.map((town) => town.slug).sort())
    if (towns.length === 0) return

    const features = (await loadMap(province))?.regions ?? []
    for (const entry of table) {
      const polygons = features.filter((feature) => feature.properties.code === entry.code && !feature.properties.shared)
      expect(polygons, `${province}/${entry.slug} → ${entry.code}`).toHaveLength(1)
    }
    expect(new Set(table.map((entry) => entry.code)).size, "two towns share a municipality").toBe(table.length)
  })

  it("leaves no municipality of Gipuzkoa or Bizkaia without its town, except the known gaps of the seed", async () => {
    // Usansolo (48916) split from Galdakao in 2022 and is not in the API's seed yet: drawn, not a link.
    const knownGaps = ["Usansolo"]
    const missing = []
    for (const province of ["gipuzkoa", "bizkaia"]) {
      const codes = new Set(townMunicipalities(province).map((entry) => entry.code))
      const municipalities = ((await loadMap(province))?.regions ?? []).filter((feature) => !feature.properties.shared)
      missing.push(...municipalities.filter((feature) => !codes.has(feature.properties.code)).map((feature) => feature.properties.name))
    }
    expect(missing).toEqual(knownGaps)
  })
})

describe("map data", () => {
  it.each(["euskal-herria", ...provinces])("%s: every shape is wound for d3-geo (no globe-sized polygons)", async (name) => {
    const map = await loadMap(name)
    expect(map, `no map for ${name}`).not.toBeNull()
    for (const feature of [...map!.regions, ...map!.water]) expect(geoArea(feature), feature.properties.name).toBeLessThan(0.01)
  })

  it("has the seven herrialdeak, each with a point to anchor its name", async () => {
    const regions = (await loadMap("euskal-herria"))?.regions ?? []
    expect(regions.map((feature) => feature.properties.code).sort()).toEqual(
      ["araba", "bizkaia", "gipuzkoa", "lapurdi", "nafarroa", "nafarroa-beherea", "zuberoa"].sort(),
    )
    for (const feature of regions) expect(feature.properties.label, feature.properties.code).toHaveLength(2)
  })

  it("gives municipalities their population and Basque name, and marks the capitals", async () => {
    const bizkaia = (await loadMap("bizkaia"))?.regions ?? []
    const bilbao = bizkaia.find((feature) => feature.properties.code === "48020")
    expect(bilbao?.properties).toMatchObject({ basqueName: "Bilbo", capital: true })
    expect(bilbao?.properties.population).toBeGreaterThan(300_000)
  })

  it("draws the ría of Bilbao", async () => {
    const rivers = (await loadMap("bizkaia"))?.rivers ?? []
    expect(rivers.some((river) => river.properties.kind === "estuary" && river.properties.name === "Bilboko itsasadarra")).toBe(true)
  })
})
