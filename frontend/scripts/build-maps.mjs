// Builds the TopoJSON maps of Euskal Herria and the town ↔ municipality table.
//
// Sources (see SPEC.md, "Maps"), downloaded by download-map-sources.mjs into scripts/sources/:
// - Hegoalde: IGN/CNIG INSPIRE WFS "Unidades administrativas" (CC BY 4.0), full-resolution municipalities with
//   their INE code. Araba includes the Burgos enclaves of Trebiñu and La Puebla de Arganzón (owner's decision,
//   2026-10-02: drawn inside Araba, never as a hole). Shared land (INE 53xxx) goes to the province that holds it,
//   decided with the province outlines of es-atlas (only used for that).
// - Iparralde: communes of département 64 from geo.api.gouv.fr (IGN France / Etalab, Licence Ouverte), grouped into
//   the three historical provinces by scripts/data/iparralde-provinces.json.
// - Water: rivers and rías, reservoirs and lakes from OpenStreetMap (ODbL), clipped to each map.
// - Labels: population and Basque name of every municipality from Wikidata (CC0), plus an inner point to anchor
//   the name. The frontend decides which names fit; capitals go first, then by population.
// - Towns: postgres/initdb/03-provinces.sql and 04-towns.sql (read-only), the API's seed.
//
// All municipalities are simplified together, so neighbours keep one shared border, and every herrialde is the
// union of its municipalities: the province map and the Euskal Herria map have exactly the same borders.
//
// Output (committed): src/data/maps/euskal-herria.topo.json (the 7 herrialdeak),
// src/data/maps/<provinceSlug>.topo.json (its municipalities), src/data/town-municipalities.json.

import { existsSync, readFileSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { geoArea, geoBounds, geoCentroid, geoContains, geoLength } from "d3-geo"
import mapshaper from "mapshaper"
import osmtogeojson from "osmtogeojson"
import * as topojson from "topojson-client"

const FRONTEND = path.resolve(import.meta.dirname, "..")
const OUT_DIR = path.join(FRONTEND, "src/data/maps")
const TABLE_FILE = path.join(FRONTEND, "src/data/town-municipalities.json")
const ES_ATLAS = path.join(FRONTEND, "node_modules/es-atlas/es/municipalities.json")
const IGN_HEGOALDE = path.join(import.meta.dirname, "sources/ign-hegoalde.geojson")
const DEP64 = path.join(import.meta.dirname, "sources/dep64-communes.geojson")
const IPARRALDE = path.join(import.meta.dirname, "data/iparralde-provinces.json")
const OSM_WATER = path.join(import.meta.dirname, "sources/osm-water.json")
const WIKIDATA = path.join(import.meta.dirname, "sources/municipalities-wikidata.json")
const SEED = path.resolve(FRONTEND, "../postgres/initdb")

/** Hegoalde: INE province code → province slug (as in the API). */
const HEGOALDE = { 20: "gipuzkoa", 48: "bizkaia", "01": "araba", 31: "nafarroa" }
/** Burgos municipalities drawn inside Araba: Condado de Treviño (Trebiñu) and La Puebla de Arganzón. */
const ENCLAVES_IN_ARABA = new Set(["09109", "09276"])
/** Names as the API has them. */
const NAMES = {
  gipuzkoa: "Gipuzkoa",
  bizkaia: "Bizkaia",
  araba: "Araba",
  nafarroa: "Nafarroa",
  lapurdi: "Lapurdi",
  "nafarroa-beherea": "Nafarroa Beherea",
  zuberoa: "Zuberoa",
}
/** Towns whose name does not match the official one by rule. Keep this list short and reviewed. */
const MANUAL_MATCHES = { "bizkaia/bilbo": "48020" } // Bilbo → INE "Bilbao"
/** Simplification of every border, in metres: close to the real line at the zoom of a province map. */
const SIMPLIFY_METRES = 20
/** The Euskal Herria map is drawn much smaller than a province map: its outlines can be coarser. */
const OVERVIEW_SIMPLIFY_METRES = 80

const QUANTIZATION = 1e5
const EARTH_RADIUS_KM = 6371

/** Capitals of the herrialdeak: Bilbo, Donostia, Gasteiz, Iruñea, Baiona, Donibane Garazi, Maule. Labelled first. */
const CAPITALS = new Set(["48020", "20069", "01059", "31201", "64102", "64485", "64371"])
/** A river is drawn when its named course inside Euskal Herria is at least this long (km); longer on the overview. */
const RIVER_MIN_KM = 14
const OVERVIEW_RIVER_MIN_KM = 60
/**
 * Rías: OpenStreetMap runs the coastline up the estuaries, so a ría is sea, not a water surface; it is mapped as a
 * river line ("Bilboko itsasadarra"). They are kept by name whatever their length and drawn thicker than rivers.
 */
const ESTUARY_NAME = /itsasadar|\bría\b|\bria\b|estuaire/i
const ESTUARY_MIN_KM = 0.3
/** Water surfaces: wide rivers from this area (km²), reservoirs and lakes from a larger one. */
const RIVER_WATER_MIN_KM2 = 0.2
const LAKE_MIN_KM2 = 0.3
const OVERVIEW_WATER_MIN_KM2 = 2

// ---------------------------------------------------------------- sources

if (![IGN_HEGOALDE, DEP64, OSM_WATER, WIKIDATA].every((source) => existsSync(source))) {
  throw new Error("Map sources missing: run `npm run maps:download` first")
}

const atlas = JSON.parse(readFileSync(ES_ATLAS, "utf8"))
const atlasProvinces = topojson.feature(atlas, atlas.objects.provinces).features

const municipalities = [...readHegoalde(), ...readIparralde()]
const { simplified, outlines } = await simplifyAndDissolve(municipalities)

const wikidata = JSON.parse(readFileSync(WIKIDATA, "utf8"))
const labelPoints = await innerPoints([
  ...simplified,
  ...outlines.map((outline) => ({ ...outline, properties: { code: outline.province } })),
])

const herrialdeak = Object.keys(NAMES).map((slug) => {
  const outline = outlines.find((candidate) => candidate.province === slug)
  if (!outline) throw new Error(`No outline for ${slug}`)
  return feature(slug, { name: NAMES[slug], label: labelPoints.get(slug) }, outline.geometry)
})
const municipalitiesByProvince = {} // province slug → features with id = official code
for (const municipality of simplified) {
  const { code, name, province, shared } = municipality.properties
  const facts = wikidata[code]
  const properties = {
    name,
    basqueName: facts?.basqueName ?? null,
    population: facts?.population ?? 0,
    label: labelPoints.get(code),
    ...(CAPITALS.has(code) && { capital: true }),
    ...(shared && { shared }),
  }
  ;(municipalitiesByProvince[province] ??= []).push(feature(code, properties, municipality.geometry))
}
for (const code of CAPITALS) {
  if (!simplified.some((municipality) => municipality.properties.code === code)) throw new Error(`Capital ${code} is not in the maps`)
}

const { rivers, water } = readWater()

// ---------------------------------------------------------------- output

await mkdir(OUT_DIR, { recursive: true })
const euskalHerria = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: outlines.flatMap(polygonsOf) } }
await writeTopology("euskal-herria", {
  herrialdeak,
  ...(await clipWater(
    euskalHerria,
    rivers.filter((river) => river.properties.kind === "estuary" || river.properties.km >= OVERVIEW_RIVER_MIN_KM),
    water.filter((surface) => surface.properties.km2 >= OVERVIEW_WATER_MIN_KM2),
    OVERVIEW_SIMPLIFY_METRES,
  )),
})
for (const slug of Object.keys(NAMES)) {
  const { geometry } = outlines.find((candidate) => candidate.province === slug)
  await writeTopology(slug, {
    municipalities: municipalitiesByProvince[slug],
    ...(await clipWater({ type: "Feature", geometry }, rivers, water, SIMPLIFY_METRES)),
  })
}
await writeTownTable()

// ---------------------------------------------------------------- helpers

function readHegoalde() {
  const result = []
  let shared = 0
  for (const unit of JSON.parse(readFileSync(IGN_HEGOALDE, "utf8")).features) {
    const { code, name } = unit.properties
    const geometry = rewind(code, unit.geometry)
    let province = HEGOALDE[code.slice(0, 2)]
    if (ENCLAVES_IN_ARABA.has(code)) province = "araba"
    let isShared = false
    if (code.startsWith("53")) {
      // Shared land (parzonerías, facerías, Bardenas Reales…): drawn in the province that holds its centre.
      const centre = geoCentroid({ type: "Feature", geometry })
      const holder = Object.entries(HEGOALDE).find(([ine]) =>
        geoContains(
          atlasProvinces.find((candidate) => candidate.id === ine),
          centre,
        ),
      )
      if (!holder) continue // shared land of Burgos, La Rioja or Aragón inside the download box
      province = holder[1]
      isShared = true
      shared++
    }
    if (!province) continue
    result.push({ type: "Feature", properties: { code, name, province, shared: isShared }, geometry })
  }
  console.log(`Hegoalde: ${result.length} municipalities (${shared} shared land, Trebiñu and La Puebla in Araba)`)
  return result
}

function readIparralde() {
  const assignment = JSON.parse(readFileSync(IPARRALDE, "utf8"))
  const source = JSON.parse(readFileSync(DEP64, "utf8")).features
  const seen = new Set()
  const result = []
  for (const [slug, communes] of Object.entries(assignment.provinces)) {
    if (communes.length === 0) throw new Error(`${slug}: no communes in ${path.relative(FRONTEND, IPARRALDE)}`)
    for (const { code, name } of communes) {
      const commune = source.find((candidate) => candidate.properties.code === code)
      if (!commune) throw new Error(`${slug}: no commune with INSEE code ${code} (${name}) in the source`)
      if (commune.properties.nom !== name) throw new Error(`${slug}: ${code} is "${commune.properties.nom}" in the source, not "${name}"`)
      if (seen.has(code)) throw new Error(`${code} (${name}) is assigned to more than one province`)
      seen.add(code)
      result.push({ type: "Feature", properties: { code, name, province: slug, shared: false }, geometry: rewind(code, commune.geometry) })
    }
  }
  console.log(`Iparralde: ${seen.size} communes`)
  return result
}

/** Simplifies every municipality at once (shared borders stay shared) and dissolves them into herrialdeak. */
async function simplifyAndDissolve(features) {
  const commands = [
    "-i all.json",
    `-simplify interval=${SIMPLIFY_METRES} keep-shapes`,
    "-o simplified.json format=geojson",
    "-dissolve province",
    `-simplify interval=${OVERVIEW_SIMPLIFY_METRES} keep-shapes`,
    "-o outlines.json format=geojson",
  ].join(" ")
  const out = await mapshaper.applyCommands(commands, { "all.json": { type: "FeatureCollection", features } })
  return {
    simplified: JSON.parse(out["simplified.json"]).features,
    outlines: JSON.parse(out["outlines.json"]).features.map((outline) => ({
      province: outline.properties.province,
      geometry: outline.geometry,
    })),
  }
}

function feature(id, properties, geometry) {
  return { type: "Feature", id, properties: { code: id, ...properties }, geometry: rewind(id, geometry) }
}

/**
 * d3-geo reads polygons by winding order: a ring wound the other way covers the rest of the globe. The French
 * source follows RFC 7946 (the opposite of d3), and simplification can collapse and invert tiny slivers; such
 * polygons are turned around instead of dropped, so no land goes missing.
 */
function rewind(id, geometry) {
  const fix = (polygon) => {
    if (geoArea({ type: "Polygon", coordinates: polygon }) <= 2 * Math.PI) return polygon
    return polygon.map((ring) => [...ring].reverse())
  }
  if (geometry.type === "Polygon") return { ...geometry, coordinates: fix(geometry.coordinates) }
  if (geometry.type === "MultiPolygon") return { ...geometry, coordinates: geometry.coordinates.map(fix) }
  return geometry
}

/** One TopoJSON per map, with one object per layer (municipalities or herrialdeak, water, rivers). */
async function writeTopology(name, layers) {
  const inputs = {}
  for (const [layer, features] of Object.entries(layers)) {
    for (const candidate of features) {
      // d3-geo reads rings by winding order: a wrongly wound ring would cover the whole globe.
      if (candidate.geometry.type.endsWith("Polygon") && geoArea(candidate) > 2 * Math.PI) {
        throw new Error(`${name}: ${candidate.id ?? layer} has inverted winding`)
      }
    }
    inputs[`${layer}.json`] = { type: "FeatureCollection", features }
  }
  const files = Object.keys(inputs).join(" ")
  const commands = `-i ${files} combine-files -o out.json format=topojson id-field=code quantization=${QUANTIZATION}`
  const out = await mapshaper.applyCommands(commands, inputs)
  const file = path.join(OUT_DIR, `${name}.topo.json`)
  await writeFile(file, out["out.json"])
  const counts = Object.entries(layers)
    .map(([layer, features]) => `${features.length} ${layer}`)
    .join(", ")
  console.log(`${path.relative(FRONTEND, file)}: ${counts}, ${(out["out.json"].length / 1024).toFixed(0)} KB`)
}

/** A point well inside each shape (mapshaper's "inner" point), where its name can be anchored. */
async function innerPoints(features) {
  const input = {
    type: "FeatureCollection",
    features: features.map(({ properties, geometry }) => ({ type: "Feature", properties: { code: properties.code }, geometry })),
  }
  const out = await mapshaper.applyCommands("-i in.json -points inner -o out.json format=geojson", { "in.json": input })
  const points = new Map()
  for (const point of JSON.parse(out["out.json"]).features) {
    if (point.geometry)
      points.set(
        point.properties.code,
        point.geometry.coordinates.map((value) => Math.round(value * 1e5) / 1e5),
      )
  }
  return points
}

/**
 * Rivers (lines, grouped by name, only the long ones) and water surfaces (rías, wide rivers, reservoirs, lakes)
 * from the OpenStreetMap extract.
 */
function readWater() {
  const collection = osmtogeojson(JSON.parse(readFileSync(OSM_WATER, "utf8")), { flatProperties: true })
  const lengthByName = new Map()
  const lines = []
  const water = []
  for (const element of collection.features) {
    const { geometry, properties } = element
    if (!geometry) continue
    if (properties.waterway === "river" && geometry.type === "LineString") {
      const name = properties.name ?? ""
      const km = geoLength(element) * EARTH_RADIUS_KM
      if (name) lengthByName.set(name, (lengthByName.get(name) ?? 0) + km)
      lines.push({ name, geometry })
    } else if (geometry.type.endsWith("Polygon")) {
      const surface = rewind("water", geometry)
      const km2 = geoArea({ type: "Feature", geometry: surface }) * EARTH_RADIUS_KM ** 2
      const isRiver = ["river", "estuary", "canal"].includes(properties.water)
      if (km2 >= (isRiver ? RIVER_WATER_MIN_KM2 : LAKE_MIN_KM2)) {
        water.push({
          type: "Feature",
          properties: { kind: isRiver ? "river" : "lake", km2: Math.round(km2 * 100) / 100 },
          geometry: surface,
        })
      }
    }
  }
  const rivers = lines
    .map((line) => {
      const km = lengthByName.get(line.name) ?? 0
      const kind = ESTUARY_NAME.test(line.name) ? "estuary" : "river"
      const kept = kind === "estuary" ? km >= ESTUARY_MIN_KM : km >= RIVER_MIN_KM
      return kept && { type: "Feature", properties: { name: line.name, kind, km: Math.round(km) }, geometry: line.geometry }
    })
    .filter(Boolean)
  const named = (kind) => [...new Set(rivers.filter((river) => river.properties.kind === kind).map((river) => river.properties.name))]
  console.log(
    `Water: ${named("river").length} rivers, ${named("estuary").length} rías (${named("estuary").join(", ")}), ${water.length} surfaces`,
  )
  return { rivers, water }
}

/** The rivers and water surfaces that fall inside a map's outline, cut to it and simplified like its borders. */
async function clipWater(outline, rivers, water, simplifyMetres) {
  const [[west, south], [east, north]] = geoBounds(outline)
  const near = (candidate) => {
    const [[w, s], [e, n]] = geoBounds(candidate)
    return w <= east && e >= west && s <= north && n >= south
  }
  const inputs = {
    "outline.json": { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: outline.geometry }] },
    "water.json": { type: "FeatureCollection", features: water.filter(near) },
    "rivers.json": { type: "FeatureCollection", features: rivers.filter(near) },
  }
  const commands = [
    "-i outline.json water.json rivers.json combine-files",
    `-simplify interval=${simplifyMetres} target=water`,
    // Rivers are thin lines under the borders: three times coarser is still faithful at this zoom
    `-simplify interval=${simplifyMetres * 3} target=rivers`,
    "-clip outline target=water,rivers remove-slivers",
    "-o water-out.json format=geojson target=water",
    "-o rivers-out.json format=geojson target=rivers",
  ].join(" ")
  const out = await mapshaper.applyCommands(commands, inputs)
  const read = (file, keep) =>
    (JSON.parse(out[file]).features ?? [])
      .filter((candidate) => candidate.geometry)
      .map((candidate) => ({ type: "Feature", properties: keep(candidate.properties), geometry: rewind("water", candidate.geometry) }))
  return {
    water: read("water-out.json", ({ kind }) => ({ kind })),
    rivers: read("rivers-out.json", ({ name, kind }) => ({ name, kind })),
  }
}

function polygonsOf({ geometry }) {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
}

/** Seed towns → official municipality code, matched by name. */
async function writeTownTable() {
  const provinceSql = readFileSync(path.join(SEED, "03-provinces.sql"), "utf8")
  const townSql = readFileSync(path.join(SEED, "04-towns.sql"), "utf8")
  const provinceById = Object.fromEntries([...provinceSql.matchAll(/VALUES \((\d+), '([^']*)'/g)].map((match) => [match[1], match[2]]))
  const towns = [...townSql.matchAll(/VALUES \((\d+), '((?:[^']|'')*)', '((?:[^']|'')*)', (\d+),/g)].map((match) => ({
    slug: match[2],
    name: match[3].replace(/''/g, "'"),
    province: provinceById[match[4]],
  }))

  const table = {}
  const byRule = { exact: 0, part: 0, manual: 0 }
  for (const town of towns) {
    const candidates = municipalitiesByProvince[town.province] ?? []
    const manual = MANUAL_MATCHES[`${town.province}/${town.slug}`]
    let match = manual && candidates.find((candidate) => candidate.id === manual)
    let rule = "manual"
    if (!match) {
      rule = "exact"
      // "Donostia/San Sebastián": either official name.
      match = unique(candidates.filter((candidate) => variants(candidate).some((variant) => isSame(variant, town))))
    }
    if (!match) {
      rule = "part"
      // "Soraluze-Placencia de las Armas", "Arrankudiaga-Zollo": one side of a hyphenated official name.
      match = unique(
        candidates.filter((candidate) => variants(candidate).some((variant) => variant.split("-").some((part) => isSame(part, town)))),
      )
    }
    if (!match) throw new Error(`No municipality for ${town.province}/${town.slug} (${town.name}): add it to MANUAL_MATCHES`)
    if (rule === "part") console.log(`  matched by part of the name: ${town.province}/${town.slug} → ${match.id} ${match.properties.name}`)
    byRule[rule]++
    ;(table[town.province] ??= []).push({ slug: town.slug, name: town.name, code: match.id })
  }

  const file = {
    description:
      "Towns of the API seed (postgres/initdb/04-towns.sql) and the official code of their municipality (INE / INSEE). Generated by scripts/build-maps.mjs.",
    provinces: table,
  }
  await writeFile(TABLE_FILE, JSON.stringify(file, null, 2) + "\n")
  console.log(
    `${path.relative(FRONTEND, TABLE_FILE)}: ${towns.length} towns (${byRule.exact} exact, ${byRule.part} by part, ${byRule.manual} manual)`,
  )
}

function variants(municipality) {
  return municipality.properties.name.split(/\s*\/\s*/)
}

function isSame(officialName, town) {
  const name = normalize(officialName)
  return name === town.slug || name === normalize(town.name)
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function unique(candidates) {
  if (candidates.length > 1) throw new Error(`Ambiguous match: ${candidates.map((candidate) => candidate.id).join(", ")}`)
  return candidates[0]
}
