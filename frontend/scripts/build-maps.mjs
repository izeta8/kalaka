// Builds the TopoJSON maps of Euskal Herria and the town ↔ municipality table.
//
// Sources (see SPEC.md, "Maps"):
// - Hegoalde: es-atlas (node_modules/es-atlas/es/municipalities.json), built from IGN/CNIG
//   "Líneas límite municipales", CC BY 4.0. Ids are INE codes. Already simplified and quantized
//   upstream (simplification 1e-4, quantization 1e4 over Spain: ~180 m grid); used as is.
// - Iparralde: communes of département 64 from geo.api.gouv.fr (IGN France / Etalab, Licence Ouverte),
//   downloaded by download-map-sources.mjs, grouped into the three historical provinces by
//   scripts/data/iparralde-provinces.json. Skipped (with a warning) until both exist.
// - Towns: postgres/initdb/03-provinces.sql and 04-towns.sql (read-only), the API's seed.
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
const DEP64 = path.join(import.meta.dirname, "sources/dep64-communes.geojson")
const IPARRALDE = path.join(import.meta.dirname, "data/iparralde-provinces.json")
const SEED = path.resolve(FRONTEND, "../postgres/initdb")

/** Hegoalde: province slug (as in the API) → INE province code. */
const HEGOALDE = { gipuzkoa: "20", bizkaia: "48", araba: "01", nafarroa: "31" }
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
/** Iparralde communes are simplified to about this precision (metres), similar to the es-atlas grid. */
const IPARRALDE_SIMPLIFY_METRES = 50

const QUANTIZATION = 1e5

// ---------------------------------------------------------------- sources

const atlas = JSON.parse(readFileSync(ES_ATLAS, "utf8"))
const spainProvinces = topojson.feature(atlas, atlas.objects.provinces).features
const spainMunicipalities = topojson.feature(atlas, atlas.objects.municipalities).features

const herrialdeak = [] // features with id = province slug
const municipalitiesByProvince = {} // province slug → features with id = official code

for (const [slug, code] of Object.entries(HEGOALDE)) {
  const province = spainProvinces.find((feature) => feature.id === code)
  herrialdeak.push(feature(slug, { name: NAMES[slug] }, province.geometry))
  municipalitiesByProvince[slug] = spainMunicipalities
    .filter((municipality) => {
      if (municipality.id.startsWith(code)) return true
      // Shared land (parzonerías, facerías, Bardenas Reales…): INE codes 53xxx, drawn in the province that holds it.
      return municipality.id.startsWith("53") && geoContains(province, geoCentroid(municipality))
    })
    .map((municipality) => feature(municipality.id, sharedLand(municipality, code), municipality.geometry))
}

const iparralde = readIparralde()
if (iparralde) {
  for (const [slug, communes] of Object.entries(iparralde)) {
    municipalitiesByProvince[slug] = communes
    herrialdeak.push(...(await dissolve(slug, communes)))
  }
} else {
  console.warn("! Iparralde skipped: run `npm run maps:download` and fill scripts/data/iparralde-provinces.json")
}

// ---------------------------------------------------------------- output

await mkdir(OUT_DIR, { recursive: true })
await writeTopology("euskal-herria", "herrialdeak", herrialdeak)
for (const [slug, features] of Object.entries(municipalitiesByProvince)) await writeTopology(slug, "municipalities", features)
await writeTownTable()

// ---------------------------------------------------------------- helpers

function sharedLand(municipality, provinceCode) {
  const shared = !municipality.id.startsWith(provinceCode)
  return shared ? { name: municipality.properties.name, shared } : { name: municipality.properties.name }
}

function feature(id, properties, geometry) {
  return { type: "Feature", id, properties: { code: id, ...properties }, geometry: rewind(id, geometry) }
}

/**
 * d3-geo reads polygons by winding order: a wrongly wound one covers the rest of the globe. The upstream
 * simplification leaves a few tiny polygons collapsed and inverted (e.g. a sliver of Ataun, Facería de Aldape);
 * they are turned around instead of dropped, so no land goes missing.
 */
function rewind(id, geometry) {
  const fix = (polygon) => {
    if (geoArea({ type: "Polygon", coordinates: polygon }) <= 2 * Math.PI) return polygon
    console.log(`  rewound an inverted polygon of ${id}`)
    return polygon.map((ring) => [...ring].reverse())
  }
  if (geometry.type === "Polygon") return { ...geometry, coordinates: fix(geometry.coordinates) }
  if (geometry.type === "MultiPolygon") return { ...geometry, coordinates: geometry.coordinates.map(fix) }
  return geometry
}

function readIparralde() {
  if (!existsSync(DEP64)) return null
  const assignment = JSON.parse(readFileSync(IPARRALDE, "utf8"))
  const entries = Object.entries(assignment.provinces)
  if (entries.every(([, communes]) => communes.length === 0)) return null

  const source = JSON.parse(readFileSync(DEP64, "utf8")).features
  const seen = new Set()
  const result = {}
  for (const [slug, communes] of entries) {
    result[slug] = communes.map(({ code, name }) => {
      const commune = source.find((candidate) => candidate.properties.code === code)
      if (!commune) throw new Error(`${slug}: no commune with INSEE code ${code} (${name}) in the source`)
      if (commune.properties.nom !== name) throw new Error(`${slug}: ${code} is "${commune.properties.nom}" in the source, not "${name}"`)
      if (seen.has(code)) throw new Error(`${code} (${name}) is assigned to more than one province`)
      seen.add(code)
      return feature(code, { name }, commune.geometry)
    })
  }
  console.log(`Iparralde: ${seen.size} communes`)
  return result
}

/** Simplifies a province's communes in place and returns its outline as one feature. */
async function dissolve(slug, communes) {
  const input = { type: "FeatureCollection", features: communes }
  const commands = `-i in.json -simplify interval=${IPARRALDE_SIMPLIFY_METRES} keep-shapes -o communes.json format=geojson -dissolve -o outline.json format=geojson`
  const out = await mapshaper.applyCommands(commands, { "in.json": input })
  const simplified = JSON.parse(out["communes.json"]).features
  communes.splice(
    0,
    communes.length,
    ...simplified.map((commune) => feature(commune.properties.code, { name: commune.properties.name }, commune.geometry)),
  )
  // -dissolve without fields drops the attributes, so mapshaper writes a GeometryCollection, not features
  const outline = JSON.parse(out["outline.json"])
  const geometry = outline.features ? outline.features[0].geometry : outline.geometries[0]
  return [feature(slug, { name: NAMES[slug] }, geometry)]
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
