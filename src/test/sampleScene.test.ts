import { describe, it, expect } from 'vitest'
import { initialDoc } from '../assets/sample/initialDoc'

describe('initialDoc', () => {
  it('has 240 frames at 24fps', () => {
    expect(initialDoc.frameCount).toBe(240)
    expect(initialDoc.fps).toBe(24)
    expect(initialDoc.frames).toHaveLength(240)
  })

  it('starts with a white canvas and no seeded content', () => {
    expect(initialDoc.backgroundColor).toBe('#ffffff')
    expect(initialDoc.layerIds).toEqual([])
    expect(initialDoc.layers).toEqual({})
    expect(initialDoc.imageAssets).toEqual({})
  })

  it('all frames start empty until the user records data', () => {
    for (const frame of initialDoc.frames) {
      expect(Object.keys(frame)).toHaveLength(0)
    }
  })
})
