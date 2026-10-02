// Downloads the map sources that are not in node_modules into scripts/sources/ (git-ignored).
// Run it once, then `npm run maps:build`.
//
// - Communes of département 64 (Pyrénées-Atlantiques), official boundaries.
//   Source: geo.api.gouv.fr (IGN Admin Express / Etalab), Licence Ouverte 2.0.

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const SOURCES_DIR = path.join(import.meta.dirname, "sources")
const DEP64_URL = "https://geo.api.gouv.fr/departements/64/communes?format=geojson&geometry=contour&fields=nom,code"

await mkdir(SOURCES_DIR, { recursive: true })
const response = await fetch(DEP64_URL)
if (!response.ok) throw new Error(`${DEP64_URL} answered ${response.status}`)
const geojson = await response.json()
await writeFile(path.join(SOURCES_DIR, "dep64-communes.geojson"), JSON.stringify(geojson))
console.log(`dep64-communes.geojson: ${geojson.features.length} communes`)
