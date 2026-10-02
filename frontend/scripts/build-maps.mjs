// Builds the TopoJSON maps of Euskal Herria and the town ↔ municipality table.
//
// Sources (see SPEC.md, "Maps"), downloaded by download-map-sources.mjs into scripts/sources/:
// - Hegoalde: IGN/CNIG INSPIRE WFS "Unidades administrativas" (CC BY 4.0), full-resolution municipalities with
//   their INE code. Araba includes the Burgos enclaves of Trebiñu and La Puebla de Arganzón (owner's decision,
//   2026-10-02: drawn inside Araba, never as a hole). Shared land (INE 53xxx) goes to the province that holds it,
//   decided with the province outlines of es-atlas (only used for that).
// - Iparralde: communes of département 64 from geo.api.gouv.fr (IGN France / Etalab, Licence Ouverte), grouped into
//   the three historical provinces by scripts/data/iparralde-provinces.json.
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
import { geoArea, geoCentroid, geoContains } from "d3-geo"
import mapshaper from "mapshaper"
import * as topojson from "topojson-client"

const FRONTEND = path.resolve(import.meta.dirname, "..")
const OUT_DIR = path.join(FRONTEND, "src/data/maps")
const TABLE_FILE = path.join(FRONTEND, "src/data/town-municipalities.json")
const ES_ATLAS = path.join(FRONTEND, "node_modules/es-atlas/es/municipalities.json")
const IGN_HEGOALDE = path.join(import.meta.dirname, "sources/ign-hegoalde.geojson")
const DEP64 = path.join(import.meta.dirname, "sources/dep64-communes.geojson")
const IPARRALDE = path.join(import.meta.dirname, "data/iparralde-provinces.json")
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

// ---------------------------------------------------------------- sources

if (!existsSync(IGN_HEGOALDE) || !existsSync(DEP64)) {
  throw new Error("Map sources missing: run `npm run maps:download` first")
}

const atlas = JSON.parse(readFileSync(ES_ATLAS, "utf8"))
const atlasProvinces = topojson.feature(atlas, atlas.objects.provinces).features

const municipalities = [...readHegoalde(), ...readIparralde()]
const { simplified, outlines } = await simplifyAndDissolve(municipalities)

const herrialdeak = Object.keys(NAMES).map((slug) => {
  const outline = outlines.find((candidate) => candidate.province === slug)
  if (!outline) throw new Error(`No outline for ${slug}`)
  return feature(slug, { name: NAMES[slug] }, outline.geometry)
})
const municipalitiesByProvince = {} // province slug → features with id = official code
for (const municipality of simplified) {
  const { code, name, province, shared } = municipality.properties
  ;(municipalitiesByProvince[province] ??= []).push(feature(code, shared ? { name, shared } : { name }, municipality.geometry))
}

// ---------------------------------------------------------------- output

await mkdir(OUT_DIR, { recursive: true })
await writeTopology("euskal-herria", "herrialdeak", herrialdeak)
for (const slug of Object.keys(NAMES)) await writeTopology(slug, "municipalities", municipalitiesByProvince[slug])
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

async function writeTopology(name, object, features) {
  for (const candidate of features) {
    // d3-geo reads rings by winding order: a wrongly wound ring would cover the whole globe.
    if (geoArea(candidate) > 2 * Math.PI) throw new Error(`${name}: ${candidate.id} has inverted winding`)
  }
  const input = { type: "FeatureCollection", features }
  const commands = `-i ${object}.json -each "delete FID" -o out.json format=topojson id-field=code quantization=${QUANTIZATION}`
  const out = await mapshaper.applyCommands(commands, {
    [`${object}.json`]: input,
  })
  const file = path.join(OUT_DIR, `${name}.topo.json`)
  await writeFile(file, out["out.json"])
  console.log(`${path.relative(FRONTEND, file)}: ${features.length} shapes, ${(out["out.json"].length / 1024).toFixed(0)} KB`)
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
