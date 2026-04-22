import type { CubicSegment, Point, Stroke } from '../types/animation'

const SAMPLES_PER_SEGMENT = 16

function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p1.y,
  }
}

function segmentLength(anchor: Point, seg: CubicSegment): number {
  let len = 0
  let prev = anchor
  for (let i = 1; i <= SAMPLES_PER_SEGMENT; i++) {
    const t = i / SAMPLES_PER_SEGMENT
    const cur = cubicPoint(anchor, seg.c1, seg.c2, seg.end, t)
    const dx = cur.x - prev.x
    const dy = cur.y - prev.y
    len += Math.sqrt(dx * dx + dy * dy)
    prev = cur
  }
  return len
}

function strokeArcLength(stroke: Stroke): number {
  let total = 0
  let anchor = stroke.origin
  for (const seg of stroke.segments) {
    total += segmentLength(anchor, seg)
    anchor = seg.end
  }
  return total
}

// WeakMap cache: strokes are immutable, so this is safe
const lengthCache = new WeakMap<Stroke, number>()

function cachedStrokeLength(stroke: Stroke): number {
  const cached = lengthCache.get(stroke)
  if (cached !== undefined) return cached
  const len = strokeArcLength(stroke)
  lengthCache.set(stroke, len)
  return len
}

/**
 * Split a cubic bezier segment at parameter t ∈ (0, 1) using de Casteljau.
 * Returns the first-half segment (anchor stays the same; new end = split point).
 */
function splitCubicFirst(anchor: Point, seg: CubicSegment, t: number): CubicSegment {
  const p01x = anchor.x + t * (seg.c1.x - anchor.x)
  const p01y = anchor.y + t * (seg.c1.y - anchor.y)
  const p12x = seg.c1.x + t * (seg.c2.x - seg.c1.x)
  const p12y = seg.c1.y + t * (seg.c2.y - seg.c1.y)
  const p23x = seg.c2.x + t * (seg.end.x - seg.c2.x)
  const p23y = seg.c2.y + t * (seg.end.y - seg.c2.y)
  const p012x = p01x + t * (p12x - p01x)
  const p012y = p01y + t * (p12y - p01y)
  const p123x = p12x + t * (p23x - p12x)
  const p123y = p12y + t * (p23y - p12y)
  const splitX = p012x + t * (p123x - p012x)
  const splitY = p012y + t * (p123y - p012y)
  return { c1: { x: p01x, y: p01y }, c2: { x: p012x, y: p012y }, end: { x: splitX, y: splitY } }
}

/**
 * Arc-length from t=0 to t=tMax along a cubic bezier segment, using sampling.
 */
function arcLengthToT(anchor: Point, seg: CubicSegment, tMax: number): number {
  let len = 0
  let prev = anchor
  for (let i = 1; i <= SAMPLES_PER_SEGMENT; i++) {
    const t = (i / SAMPLES_PER_SEGMENT) * tMax
    const cur = cubicPoint(anchor, seg.c1, seg.c2, seg.end, t)
    const dx = cur.x - prev.x
    const dy = cur.y - prev.y
    len += Math.sqrt(dx * dx + dy * dy)
    prev = cur
  }
  return len
}

/**
 * Find the parameter t ∈ [0, 1] along a cubic bezier segment at which the
 * cumulative arc-length from the anchor equals `target`. Uses binary search.
 */
function findTAtLength(anchor: Point, seg: CubicSegment, target: number, totalLen: number): number {
  if (target <= 0) return 0
  if (target >= totalLen) return 1
  let lo = 0
  let hi = 1
  for (let iter = 0; iter < 32; iter++) {
    const mid = (lo + hi) / 2
    const partial = arcLengthToT(anchor, seg, mid)
    if (partial < target) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

/**
 * Trim a list of strokes to the portion revealed by `progress` ∈ [0, 1].
 *
 * Strokes are revealed sequentially in draw-order by cumulative arc-length.
 * Dot-strokes (no segments) have length 0 and appear the instant cumulative
 * progress reaches their position in the sequence.
 *
 * Fast paths: progress >= 1 returns the original array unchanged;
 * progress <= 0 returns an empty array.
 */
export function trimStrokes(strokes: Stroke[], progress: number): Stroke[] {
  if (progress >= 1) return strokes
  if (progress <= 0) return []

  const lengths = strokes.map(cachedStrokeLength)
  const total = lengths.reduce((s, l) => s + l, 0)
  if (total === 0) return strokes // all dot-strokes — show all at any progress > 0

  const target = progress * total
  const result: Stroke[] = []
  let cumulative = 0

  for (let si = 0; si < strokes.length; si++) {
    const stroke = strokes[si]
    const len = lengths[si]

    if (cumulative + len <= target) {
      // Whole stroke is within the revealed portion
      result.push(stroke)
      cumulative += len
      continue
    }

    // This stroke is partially revealed
    const remaining = target - cumulative

    if (len === 0 || stroke.segments.length === 0) {
      // Dot-stroke: length 0 but we're past its position — include it
      result.push(stroke)
      break
    }

    // Find which segment contains the cutoff
    const partialSegments: CubicSegment[] = []
    let anchor = stroke.origin
    let walked = 0

    for (const seg of stroke.segments) {
      const sLen = segmentLength(anchor, seg)
      if (walked + sLen <= remaining) {
        partialSegments.push(seg)
        walked += sLen
        anchor = seg.end
      } else {
        const needInSeg = remaining - walked
        const t = findTAtLength(anchor, seg, needInSeg, sLen)
        if (t > 0) {
          partialSegments.push(splitCubicFirst(anchor, seg, t))
        }
        break
      }
    }

    if (partialSegments.length > 0) {
      result.push({ ...stroke, segments: partialSegments })
    }
    break
  }

  return result
}
