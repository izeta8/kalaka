// Downloads the map sources into scripts/sources/ (git-ignored). Run it once, then `npm run maps:build`.
//
// - Hegoalde: municipalities of Araba, Bizkaia, Gipuzkoa and Nafarroa, plus the Burgos enclaves
//   inside Araba (Trebiñu, La Puebla de Arganzón) and shared land. Full-resolution official boundaries.
//   Source: IGN/CNIG, INSPIRE WFS "Unidades administrativas", CC BY 4.0.
// - Iparralde: communes of département 64 (Pyrénées-Atlantiques), official boundaries.
//   Source: geo.api.gouv.fr (IGN Admin Express / Etalab), Licence Ouverte 2.0.
// - Water: rivers (lines) and rías, rivers' banks, reservoirs and lakes (polygons) of Euskal Herria.
//   Source: OpenStreetMap through the Overpass API, ODbL ("© OpenStreetMap contributors").
// - Population and Basque name of every municipality and commune, by INE (P772) or INSEE (P374) code, for the labels.
//   Source: Wikidata SPARQL endpoint, CC0.
//
// Pass the names of the sources to download only some of them: `npm run maps:download -- osm wikidata`.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const SOURCES_DIR = path.join(import.meta.dirname, "sources")
const DEP64_URL = "https://geo.api.gouv.fr/departements/64/communes?format=geojson&geometry=contour&fields=nom,code"

const IGN_WFS = "https://www.ign.es/wfs-inspire/unidades-administrativas"
const EPSG_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326"
// WFS 2.0 with EPSG:4326 reads the bbox as lat,lon: south, west, north, east of Hegoalde
const HEGOALDE_BBOX = "41.85,-3.5,43.5,-0.7"
const PAGE_SIZE = 200
// INE province codes kept: Araba, Burgos (only its enclaves in Araba), Gipuzkoa, Nafarroa, Bizkaia, shared land
const PROVINCE_CODES = new Set(["01", "09", "20", "31", "48", "53"])
// Burgos municipalities that are enclaves inside Araba: Condado de Treviño and La Puebla de Arganzón
const BURGOS_ENCLAVES = new Set(["09109", "09276"])

const USER_AGENT = "kalaka-map-build/0.1 (https://github.com/izeta8/kalaka)"
// south, west, north, east of Euskal Herria (Overpass order)
const EUSKAL_HERRIA_BBOX = "41.85,-3.5,43.65,-0.7"
const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
const OVERPASS_QUERY = `[out:json][timeout:240];
(
  way["waterway"="river"](${EUSKAL_HERRIA_BBOX});
  way["natural"="water"]["water"~"^(river|estuary|reservoir|lake|lagoon|canal)$"](${EUSKAL_HERRIA_BBOX});
  relation["natural"="water"]["water"~"^(river|estuary|reservoir|lake|lagoon)$"](${EUSKAL_HERRIA_BBOX});
);
out geom;`
const WIKIDATA_QUERY = `SELECT ?code ?population ?date ?basqueName WHERE {
  { ?municipality wdt:P772 ?code . FILTER(REGEX(?code, "^(01|09|20|31|48)[0-9]{3}$")) }
  UNION
  { ?municipality wdt:P374 ?code . FILTER(STRSTARTS(?code, "64")) }
  ?municipality p:P1082 ?statement .
  ?statement ps:P1082 ?population .
  OPTIONAL { ?statement pq:P585 ?date }
  OPTIONAL { ?municipality rdfs:label ?basqueName . FILTER(LANG(?basqueName) = "eu") }
}`

const SOURCES = { ign: downloadHegoalde, dep64: downloadDep64, osm: downloadWater, wikidata: downloadPopulation }
const wanted = process.argv.slice(2)
for (const name of wanted) if (!SOURCES[name]) throw new Error(`Unknown source "${name}": use ${Object.keys(SOURCES).join(", ")}`)

await mkdir(SOURCES_DIR, { recursive: true })
for (const [name, download] of Object.entries(SOURCES)) if (wanted.length === 0 || wanted.includes(name)) await download()

async function downloadHegoalde() {
  const kept = []
  for (let startIndex = 0; ; startIndex += PAGE_SIZE) {
    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeNames: "au:AdministrativeUnit",
      outputFormat: "application/geo+json",
      srsName: EPSG_4326,
      bbox: `${HEGOALDE_BBOX},${EPSG_4326}`,
      count: String(PAGE_SIZE),
      startIndex: String(startIndex),
    })
    const response = await fetch(`${IGN_WFS}?${params}`)
    if (!response.ok) throw new Error(`IGN WFS answered ${response.status} at startIndex ${startIndex}`)
    const page = await response.json()
    for (const unit of page.features) {
      const simplified = simplifyUnit(unit)
      if (simplified) kept.push(simplified)
    }
    process.stdout.write(`  IGN page ${startIndex / PAGE_SIZE + 1}: ${page.features.length} units\n`)
    if (page.features.length < PAGE_SIZE) break
  }
  await writeFile(path.join(SOURCES_DIR, "ign-hegoalde.geojson"), JSON.stringify({ type: "FeatureCollection", features: kept }))
  console.log(`ign-hegoalde.geojson: ${kept.length} units`)
}

/**
 * Keeps the municipalities (4th order) of interest, with the INE code and the official name. Provinces are not kept:
 * the build dissolves them from their municipalities, so both maps share exactly the same borders.
 */
function simplifyUnit(unit) {
  if (unit.properties.nationalLevel?.href?.split("/").pop() !== "4thOrder") return null
  // nationalCode: 34 (Spain) + 2 digits (autonomous community) + 2 (province) + 5 (INE municipality code)
  const ine = unit.properties.nationalCode.slice(-5)
  const province = ine.slice(0, 2)
  if (!PROVINCE_CODES.has(province)) return null
  if (province === "09" && !BURGOS_ENCLAVES.has(ine)) return null
  const name = unit.properties.name?.GeographicalName?.spelling?.SpellingOfName?.text ?? ine
  return { type: "Feature", properties: { code: ine, name }, geometry: unit.geometry }
}

async function downloadDep64() {
  const response = await fetch(DEP64_URL)
  if (!response.ok) throw new Error(`${DEP64_URL} answered ${response.status}`)
  const geojson = await response.json()
  await writeFile(path.join(SOURCES_DIR, "dep64-communes.geojson"), JSON.stringify(geojson))
  console.log(`dep64-communes.geojson: ${geojson.features.length} communes`)
}

/** Overpass is a shared, often busy service: try each endpoint, waiting a little between attempts. */
async function downloadWater() {
  for (const [attempt, endpoint] of [...OVERPASS_ENDPOINTS, ...OVERPASS_ENDPOINTS].entries()) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: OVERPASS_QUERY }),
    })
    const text = await response.text()
    if (response.ok && text.startsWith("{")) {
      await writeFile(path.join(SOURCES_DIR, "osm-water.json"), text)
      console.log(`osm-water.json: ${JSON.parse(text).elements.length} elements from ${endpoint}`)
      return
    }
    console.warn(`  ${endpoint} is busy (attempt ${attempt + 1}), retrying…`)
    await new Promise((resolve) => setTimeout(resolve, 20_000))
  }
  throw new Error("Overpass did not answer: try `npm run maps:download -- osm` later")
}

/** Latest population of each municipality (the statement with the most recent date) and its Basque name. */
async function downloadPopulation() {
  const url = `https://query.wikidata.org/sparql?${new URLSearchParams({ query: WIKIDATA_QUERY })}`
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" } })
  if (!response.ok) throw new Error(`Wikidata answered ${response.status}`)
  const latest = {}
  for (const row of (await response.json()).results.bindings) {
    const code = row.code.value
    const date = row.date?.value ?? ""
    const population = Math.round(Number(row.population.value))
    const basqueName = row.basqueName?.value ?? latest[code]?.basqueName ?? null
    if (!latest[code] || date > latest[code].date) latest[code] = { population, date, basqueName }
    else if (basqueName) latest[code].basqueName = basqueName
  }
  const municipalities = Object.fromEntries(
    Object.entries(latest).map(([code, { population, basqueName }]) => [code, { population, basqueName }]),
  )
  await writeFile(path.join(SOURCES_DIR, "municipalities-wikidata.json"), JSON.stringify(municipalities))
  console.log(`municipalities-wikidata.json: ${Object.keys(municipalities).length} municipalities`)
}
