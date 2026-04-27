import type { Stroke } from '../types/animation'

interface StrokeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Returns the axis-aligned bounding box of a set of strokes, or null if the array is empty. */
export function computeStrokeBounds(strokes: Stroke[]): StrokeBounds | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const expand = (x: number, y: number) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  for (const stroke of strokes) {
    expand(stroke.origin.x, stroke.origin.y)
    for (const seg of stroke.segments) {
      expand(seg.end.x, seg.end.y)
    }
  }
  if (!isFinite(minX)) return null
  return { minX, maxX, minY, maxY }
}
