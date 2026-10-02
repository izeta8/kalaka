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

    const features = (await loadMap(province)) ?? []
    for (const entry of table) {
      const polygons = features.filter((feature) => feature.properties.code === entry.code && !feature.properties.shared)
      expect(polygons, `${province}/${entry.slug} → ${entry.code}`).toHaveLength(1)
    }
    expect(new Set(table.map((entry) => entry.code)).size, "two towns share a municipality").toBe(table.length)
  })

  it("leaves no municipality of Gipuzkoa or Bizkaia without its town", async () => {
    for (const province of ["gipuzkoa", "bizkaia"]) {
      const codes = new Set(townMunicipalities(province).map((entry) => entry.code))
      const municipalities = ((await loadMap(province)) ?? []).filter((feature) => !feature.properties.shared)
      expect(municipalities.filter((feature) => !codes.has(feature.properties.code)).map((feature) => feature.properties.name)).toEqual([])
    }
  })
})

describe("map data", () => {
  it.each(["euskal-herria", ...provinces])("%s: every shape is wound for d3-geo (no globe-sized polygons)", async (name) => {
    const features = await loadMap(name)
    if (!features) return // Iparralde maps are built only once their sources exist.
    for (const feature of features) expect(geoArea(feature), feature.properties.name).toBeLessThan(0.01)
  })

  it("has the four herrialdeak of Hegoalde", async () => {
    const features = (await loadMap("euskal-herria")) ?? []
    expect(features.map((feature) => feature.properties.code)).toEqual(expect.arrayContaining(["gipuzkoa", "bizkaia", "araba", "nafarroa"]))
  })
})
