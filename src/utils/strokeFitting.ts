import simplify from 'simplify-js'
import fitCurve from 'fit-curve'
import type { Point, CubicSegment, Stroke } from '../types/animation'

const SIMPLIFY_TOLERANCE = 1.0
const FIT_ERROR = 2.0
export const ERASER_SAMPLES_PER_SEGMENT = 16

/**
 * Angles sharper than this (in degrees) are treated as corners and fitted
 * independently on each side, preserving the sharp vertex instead of rounding it.
 * 100° catches geometric corners (≤90°) with a small margin while leaving
 * smooth cursive arcs (~150°+) unaffected.
 */
const CORNER_THRESHOLD_DEG = 100

function detectCorners(pts: [number, number][]): number[] {
  const corners: number[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    const ax = pts[i - 1][0] - pts[i][0]
    const ay = pts[i - 1][1] - pts[i][1]
    const bx = pts[i + 1][0] - pts[i][0]
    const by = pts[i + 1][1] - pts[i][1]
    const lenA = Math.hypot(ax, ay)
    const lenB = Math.hypot(bx, by)
    if (lenA < 0.5 || lenB < 0.5) continue
    const dot = (ax * bx + ay * by) / (lenA * lenB)
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI
    if (angleDeg < CORNER_THRESHOLD_DEG) corners.push(i)
  }
  return corners
}

/**
 * Fit a raw point stream into a cubic-bezier stroke.
 * Returns null for empty input; returns a single-point stroke (no segments) for a tap.
 * Sharp corners are detected and split so they are preserved as true corners.
 */
export function fitStroke(
  rawPoints: Point[],
  tool: Stroke['tool'],
  color: string,
  width: number,
): Stroke | null {
  if (rawPoints.length === 0) return null

  if (rawPoints.length === 1) {
    return { tool, color, width, origin: rawPoints[0], segments: [] }
  }

  // Deduplicate consecutive identical points (can cause fit-curve to fail)
  const deduped: Point[] = [rawPoints[0]]
  for (let i = 1; i < rawPoints.length; i++) {
    const prev = deduped[deduped.length - 1]
    if (rawPoints[i].x !== prev.x || rawPoints[i].y !== prev.y) {
      deduped.push(rawPoints[i])
    }
  }

  if (deduped.length === 1) {
    return { tool, color, width, origin: deduped[0], segments: [] }
  }

  const simplified = simplify(deduped, SIMPLIFY_TOLERANCE, true)

  if (simplified.length < 2) {
    return { tool, color, width, origin: deduped[0], segments: [] }
  }

  const pts2d = simplified.map((p) => [p.x, p.y] as [number, number])

  // Split at corner points so each side is fitted independently (preserves sharp vertices)
  const corners = detectCorners(pts2d)
  const splits = [0, ...corners, pts2d.length - 1]

  type Curve = [[number, number], [number, number], [number, number], [number, number]]
  const allCurves: Curve[] = []
  for (let i = 0; i < splits.length - 1; i++) {
    const sub = pts2d.slice(splits[i], splits[i + 1] + 1)
    if (sub.length >= 2) {
      const fitted = fitCurve(sub, FIT_ERROR) as Curve[]
      allCurves.push(...fitted)
    }
  }

  if (allCurves.length === 0) {
    return { tool, color, width, origin: { x: pts2d[0][0], y: pts2d[0][1] }, segments: [] }
  }

  const segments: CubicSegment[] = allCurves.map(([, c1, c2, end]) => ({
    c1: { x: c1[0], y: c1[1] },
    c2: { x: c2[0], y: c2[1] },
    end: { x: end[0], y: end[1] },
  }))

  return { tool, color, width, origin: { x: allCurves[0][0][0], y: allCurves[0][0][1] }, segments }
}

/**
 * Flatten a bezier stroke to a polyline.
 * Useful for future features (stroke progression, brush profiles, etc.).
 */
export function flattenStroke(stroke: Stroke): Point[] {
  if (stroke.segments.length === 0) return [stroke.origin]

  const points: Point[] = [stroke.origin]
  let prev = stroke.origin

  for (const seg of stroke.segments) {
    for (let i = 1; i <= ERASER_SAMPLES_PER_SEGMENT; i++) {
      const t = i / ERASER_SAMPLES_PER_SEGMENT
      const mt = 1 - t
      const x =
        mt * mt * mt * prev.x +
        3 * mt * mt * t * seg.c1.x +
        3 * mt * t * t * seg.c2.x +
        t * t * t * seg.end.x
      const y =
        mt * mt * mt * prev.y +
        3 * mt * mt * t * seg.c1.y +
        3 * mt * t * t * seg.c2.y +
        t * t * t * seg.end.y
      points.push({ x, y })
    }
    prev = seg.end
  }

  return points
}
