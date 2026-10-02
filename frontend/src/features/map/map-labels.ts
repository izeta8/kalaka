import { geoContains, type GeoProjection } from "d3-geo"
import type { MapRegion } from "./region-map"

/** A name drawn on the map, in SVG user units. */
export interface PlacedLabel {
  key: string
  text: string
  x: number
  y: number
  fontSize: number
  emphasis: boolean
  muted: boolean
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** Average glyph width of Inter relative to its size: enough to keep labels inside their shapes. */
const CHARACTER_WIDTH = 0.56
const LINE_HEIGHT = 1.15

/**
 * Chooses the names that can be read without hovering, so the map stays calm:
 * labels are tried in the regions' order (capitals, then by population), and a name is drawn only
 * if it fits inside its own shape (unless it may overflow) and does not touch a name already placed.
 *
 * `pixel` is the size of one screen pixel in SVG units, so labels keep the same size on screen
 * whatever the width of the map (and fewer fit on a phone).
 */
export function placeLabels(regions: MapRegion[], projection: GeoProjection, pixel: number): PlacedLabel[] {
  const placed: PlacedLabel[] = []
  const boxes: Box[] = []
  const gap = 4 * pixel

  for (const region of regions) {
    const label = region.label
    const anchor = region.feature.properties.label
    if (!label || !anchor) continue
    const point = projection(anchor)
    if (!point) continue

    const fontSize = label.size * pixel
    const halfWidth = (label.text.length * fontSize * CHARACTER_WIDTH) / 2
    const halfHeight = (fontSize * LINE_HEIGHT) / 2
    const [x, y] = point
    const box = { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight }

    if (boxes.some((other) => overlaps(box, other, gap))) continue
    if (!label.overflow && !fitsInside(box, region, projection)) continue

    boxes.push(box)
    placed.push({ key: region.feature.properties.code, text: label.text, x, y, fontSize, emphasis: label.emphasis, muted: !region.href })
  }
  return placed
}

function overlaps(a: Box, b: Box, gap: number) {
  return a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap
}

/** The corners and the middle of the edges of the label must all fall inside its region. */
function fitsInside(box: Box, region: MapRegion, projection: GeoProjection) {
  const midX = (box.left + box.right) / 2
  const midY = (box.top + box.bottom) / 2
  const samples: [number, number][] = [
    [box.left, box.top],
    [box.right, box.top],
    [box.left, box.bottom],
    [box.right, box.bottom],
    [midX, box.top],
    [midX, box.bottom],
    [box.left, midY],
    [box.right, midY],
  ]
  return samples.every((sample) => {
    const coordinates = projection.invert?.(sample)
    return coordinates ? geoContains(region.feature, coordinates) : false
  })
}
