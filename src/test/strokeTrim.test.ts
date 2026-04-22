import { describe, it, expect } from 'vitest'
import { trimStrokes } from '../utils/strokeTrim'
import type { Stroke } from '../types/animation'

// Helpers

function line(x0: number, y0: number, x1: number, y1: number, extra?: Partial<Stroke>): Stroke {
  // A "line" as a single cubic bezier with control points on the chord
  const c1 = { x: x0 + (x1 - x0) / 3, y: y0 + (y1 - y0) / 3 }
  const c2 = { x: x0 + (2 * (x1 - x0)) / 3, y: y0 + (2 * (y1 - y0)) / 3 }
  return {
    tool: 'pencil',
    color: '#fff',
    width: 4,
    origin: { x: x0, y: y0 },
    segments: [{ c1, c2, end: { x: x1, y: y1 } }],
    ...extra,
  }
}

function dot(x: number, y: number): Stroke {
  return { tool: 'pencil', color: '#fff', width: 4, origin: { x, y }, segments: [] }
}

// ── fast paths ──────────────────────────────────────────────────────────────

describe('trimStrokes fast paths', () => {
  it('returns original array reference at progress >= 1', () => {
    const strokes = [line(0, 0, 100, 0)]
    expect(trimStrokes(strokes, 1)).toBe(strokes)
    expect(trimStrokes(strokes, 1.5)).toBe(strokes)
  })

  it('returns empty array at progress <= 0', () => {
    expect(trimStrokes([line(0, 0, 100, 0)], 0)).toEqual([])
    expect(trimStrokes([line(0, 0, 100, 0)], -0.5)).toEqual([])
  })
})

// ── whole-stroke reveal ──────────────────────────────────────────────────────

describe('trimStrokes two equal strokes', () => {
  const s1 = line(0, 0, 100, 0)   // ~100px
  const s2 = line(200, 0, 300, 0) // ~100px
  const strokes = [s1, s2]

  it('progress=0.5 reveals exactly the first stroke', () => {
    const result = trimStrokes(strokes, 0.5)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(s1)
  })

  it('progress=0.25 reveals a partial first stroke', () => {
    const result = trimStrokes(strokes, 0.25)
    expect(result).toHaveLength(1)
    // Partial stroke should have same origin as s1
    expect(result[0].origin).toEqual(s1.origin)
    // End of the only segment should be before the full end
    const end = result[0].segments[result[0].segments.length - 1].end
    expect(end.x).toBeGreaterThan(0)
    expect(end.x).toBeLessThan(100)
  })

  it('progress=0.75 reveals first stroke fully + partial second', () => {
    const result = trimStrokes(strokes, 0.75)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(s1)
    // Second stroke partially trimmed
    const end = result[1].segments[result[1].segments.length - 1].end
    expect(end.x).toBeGreaterThan(200)
    expect(end.x).toBeLessThan(300)
  })
})

// ── dot-strokes ──────────────────────────────────────────────────────────────

describe('trimStrokes dot-strokes', () => {
  it('dot with no other strokes: show all at any progress > 0', () => {
    const d = dot(50, 50)
    expect(trimStrokes([d], 0.01)).toHaveLength(1)
    expect(trimStrokes([d], 0)).toHaveLength(0)
  })

  it('dot before a curve: dot appears at progress > 0, curve follows', () => {
    const d = dot(0, 0)           // length 0
    const s = line(10, 0, 110, 0) // ~100px
    const result25 = trimStrokes([d, s], 0.25)
    // dot is included (length 0, counts as "passed"), then partial curve
    expect(result25[0]).toBe(d)
  })

  it('all-dot strokes: all shown at any progress > 0', () => {
    const strokes = [dot(0, 0), dot(10, 0), dot(20, 0)]
    expect(trimStrokes(strokes, 0.5)).toHaveLength(3)
  })
})

// ── partial-segment precision ────────────────────────────────────────────────

describe('trimStrokes partial-segment precision', () => {
  it('partial trim produces a stroke ending between origin and full end', () => {
    const s = line(0, 0, 200, 0)
    const result = trimStrokes([s], 0.5)
    expect(result).toHaveLength(1)
    const end = result[0].segments[0].end
    // Should be near x=100 (midpoint of a straight bezier)
    expect(end.x).toBeGreaterThan(80)
    expect(end.x).toBeLessThan(120)
    expect(end.y).toBeCloseTo(0, 1)
  })

  it('trimmed stroke preserves color and width from original', () => {
    const s = line(0, 0, 100, 0, { color: '#ff0000', width: 8 })
    const result = trimStrokes([s], 0.5)
    expect(result[0].color).toBe('#ff0000')
    expect(result[0].width).toBe(8)
  })
})

// ── eraser-split integration ─────────────────────────────────────────────────

describe('trimStrokes after eraser split', () => {
  it('split stroke (two sub-strokes) reveals sequentially', () => {
    // Simulate erasing the middle of a single stroke → two sub-strokes
    const s1 = line(0, 0, 50, 0)
    const s2 = line(60, 0, 100, 0) // gap between 50 and 60
    const strokes = [s1, s2]

    // progress 0: nothing
    expect(trimStrokes(strokes, 0)).toHaveLength(0)
    // progress ~0.55: s1 fully included (~50px of ~90px total), s2 partial
    const result = trimStrokes(strokes, 0.9)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(s1)
  })
})
