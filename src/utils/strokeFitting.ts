import simplify from 'simplify-js'
import fitCurve from 'fit-curve'
import type { Point, CubicSegment, Stroke } from '../types/animation'

const SIMPLIFY_TOLERANCE = 1.0
const FIT_ERROR_MIN = 2.0
const FIT_ERROR_MAX = 9.0
const SMOOTH_PASSES_MIN = 4
const SMOOTH_PASSES_MAX = 140
const TAUBIN_LAMBDA_MIN = 0.4
// Capped at ~0.7 — beyond this the Taubin filter becomes numerically unstable
// (per-pass amplification overcomes shape preservation, producing runaway
// scribbles or collapsed strokes).
const TAUBIN_LAMBDA_MAX = 0.7
export const ERASER_SAMPLES_PER_SEGMENT = 16

/**
 * Map a 0–100 smoothing value to Taubin pass count, λ, and fit-curve error.
 *
 * Two knobs scale together:
 *  - λ (per-pass aggressiveness) widens the filter's effective stop-band so
 *    each pass removes more high-frequency content.
 *  - passes drives convergence — Taubin reaches a plateau once the filter
 *    asymptote is hit, so we ramp passes alongside λ for visible separation
 *    across the slider range.
 *
 * μ is derived to keep the Taubin pass-band gain near 1 at low frequencies
 * (no shrinkage). For λ > 0 the standard zero-gain-at-DC condition gives
 * μ ≈ −λ / (1 − λ·k_pb) with k_pb in (0, 1). We pick μ slightly more
 * negative than −λ so shape is preserved across the full λ range.
 */
function smoothingToParams(smoothing: number): {
  passes: number
  fitError: number
  lambda: number
  mu: number
} {
  const t = Math.max(0, Math.min(100, smoothing)) / 100
  const lambda = TAUBIN_LAMBDA_MIN + t * (TAUBIN_LAMBDA_MAX - TAUBIN_LAMBDA_MIN)
  // Anti-shrink coefficient. Slightly larger magnitude than λ keeps the
  // low-frequency gain at ~1 across the chosen λ range.
  const mu = -lambda / (1 - 0.1 * lambda)
  return {
    passes: smoothing === 0 ? 0 : Math.round(SMOOTH_PASSES_MIN + t * (SMOOTH_PASSES_MAX - SMOOTH_PASSES_MIN)),
    fitError: FIT_ERROR_MIN + t * (FIT_ERROR_MAX - FIT_ERROR_MIN),
    lambda,
    mu,
  }
}

/**
 * Taubin (λ|μ) smoothing. Each pass applies one Laplacian step with weight w.
 * Endpoints are preserved exactly. Even passes use λ (shrink), odd passes use
 * μ (anti-shrink) — across pairs of passes the macroscopic shape is preserved
 * while high-frequency components are attenuated.
 */
function smoothPoints(pts: Point[], passes: number, lambda: number, mu: number): Point[] {
  if (passes <= 0 || pts.length < 3) return pts
  let cur = pts
  for (let p = 0; p < passes; p++) {
    const w = p % 2 === 0 ? lambda : mu
    const next: Point[] = new Array(cur.length)
    next[0] = cur[0]
    for (let i = 1; i < cur.length - 1; i++) {
      const avgX = (cur[i - 1].x + cur[i + 1].x) / 2
      const avgY = (cur[i - 1].y + cur[i + 1].y) / 2
      next[i] = {
        x: cur[i].x + w * (avgX - cur[i].x),
        y: cur[i].y + w * (avgY - cur[i].y),
      }
    }
    next[cur.length - 1] = cur[cur.length - 1]
    cur = next
  }
  return cur
}

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
  smoothing = 0,
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

  const { passes, fitError, lambda, mu } = smoothingToParams(smoothing)

  // 1. Detect corners on a lightly-simplified copy. simplify-js returns the
  //    same Point object references, so we can map indices back to `deduped`.
  let workingPoints = deduped
  if (passes > 0 && deduped.length >= 3) {
    const lightSimplified = simplify(deduped, SIMPLIFY_TOLERANCE, true)
    const lightPts2d = lightSimplified.map((p) => [p.x, p.y] as [number, number])
    const lightCorners = detectCorners(lightPts2d)
    const cornerIdxInDeduped = lightCorners
      .map((i) => deduped.indexOf(lightSimplified[i]))
      .filter((i) => i > 0 && i < deduped.length - 1)
      .sort((a, b) => a - b)

    // 2. Split at corners and smooth each sub-segment in isolation, then
    //    rejoin (corner points stay exact since they sit at sub-segment ends).
    const splitsForSmooth = [0, ...cornerIdxInDeduped, deduped.length - 1]
    const smoothedAll: Point[] = []
    for (let i = 0; i < splitsForSmooth.length - 1; i++) {
      const sub = deduped.slice(splitsForSmooth[i], splitsForSmooth[i + 1] + 1)
      const smoothed = smoothPoints(sub, passes, lambda, mu)
      if (i === 0) smoothedAll.push(...smoothed)
      else smoothedAll.push(...smoothed.slice(1))
    }
    workingPoints = smoothedAll
  }

  // 3. Run the standard simplify + corner-detect + fit-curve pipeline.
  const simplified = simplify(workingPoints, SIMPLIFY_TOLERANCE, true)

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
      const fitted = fitCurve(sub, fitError) as Curve[]
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
