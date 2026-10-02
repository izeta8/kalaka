// Downloads the map sources into scripts/sources/ (git-ignored). Run it once, then `npm run maps:build`.
//
// - Hegoalde: municipalities of Araba, Bizkaia, Gipuzkoa and Nafarroa, plus the Burgos enclaves
//   inside Araba (Trebiñu, La Puebla de Arganzón) and shared land. Full-resolution official boundaries.
//   Source: IGN/CNIG, INSPIRE WFS "Unidades administrativas", CC BY 4.0.
// - Iparralde: communes of département 64 (Pyrénées-Atlantiques), official boundaries.
//   Source: geo.api.gouv.fr (IGN Admin Express / Etalab), Licence Ouverte 2.0.

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

await mkdir(SOURCES_DIR, { recursive: true })
await downloadHegoalde()
await downloadDep64()

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
