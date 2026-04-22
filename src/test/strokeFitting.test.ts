import { describe, it, expect } from 'vitest'
import { fitStroke, flattenStroke } from '../utils/strokeFitting'
import type { Point } from '../types/animation'

describe('fitStroke', () => {
  it('returns null for empty input', () => {
    expect(fitStroke([], 'pencil', '#fff', 4)).toBeNull()
  })

  it('returns single-point stroke (no segments) for a tap', () => {
    const result = fitStroke([{ x: 10, y: 20 }], 'pencil', '#fff', 4)
    expect(result).not.toBeNull()
    expect(result!.segments).toHaveLength(0)
    expect(result!.origin).toEqual({ x: 10, y: 20 })
  })

  it('returns single-point stroke for all-identical points', () => {
    const pts: Point[] = Array.from({ length: 5 }, () => ({ x: 5, y: 5 }))
    const result = fitStroke(pts, 'pencil', '#fff', 4)
    expect(result).not.toBeNull()
    expect(result!.segments).toHaveLength(0)
  })

  it('produces segments for a straight line', () => {
    const pts: Point[] = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }))
    const result = fitStroke(pts, 'pencil', '#000', 2)
    expect(result).not.toBeNull()
    expect(result!.segments.length).toBeGreaterThan(0)
  })

  it('preserves tool, color, and width', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }]
    const result = fitStroke(pts, 'eraser', '#ff0000', 8)
    expect(result!.tool).toBe('eraser')
    expect(result!.color).toBe('#ff0000')
    expect(result!.width).toBe(8)
  })

  it('each segment end connects path end-to-end', () => {
    const pts: Point[] = Array.from({ length: 30 }, (_, i) => ({
      x: i * 5,
      y: Math.sin(i * 0.3) * 20,
    }))
    const result = fitStroke(pts, 'pencil', '#fff', 2)
    expect(result).not.toBeNull()
    // Last segment end should be near the last input point
    const lastSeg = result!.segments[result!.segments.length - 1]
    const lastPt = pts[pts.length - 1]
    const dist = Math.hypot(lastSeg.end.x - lastPt.x, lastSeg.end.y - lastPt.y)
    expect(dist).toBeLessThan(10)
  })
})

describe('flattenStroke', () => {
  it('returns origin for a tap stroke', () => {
    const stroke = fitStroke([{ x: 5, y: 10 }], 'pencil', '#fff', 2)!
    const flat = flattenStroke(stroke)
    expect(flat).toHaveLength(1)
    expect(flat[0]).toEqual({ x: 5, y: 10 })
  })

  it('returns more points than segments * ERASER_SAMPLES_PER_SEGMENT (includes origin)', () => {
    const pts: Point[] = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }))
    const stroke = fitStroke(pts, 'pencil', '#fff', 2)!
    const flat = flattenStroke(stroke)
    // flat should include origin + segments * SAMPLES_PER_SEGMENT
    expect(flat.length).toBeGreaterThan(stroke.segments.length)
  })

  it('last flattened point is near last segment end', () => {
    const pts: Point[] = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }))
    const stroke = fitStroke(pts, 'pencil', '#fff', 2)!
    const flat = flattenStroke(stroke)
    const lastSeg = stroke.segments[stroke.segments.length - 1]
    const lastFlat = flat[flat.length - 1]
    expect(lastFlat.x).toBeCloseTo(lastSeg.end.x, 5)
    expect(lastFlat.y).toBeCloseTo(lastSeg.end.y, 5)
  })
})
