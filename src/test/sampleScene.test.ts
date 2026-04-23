import { describe, it, expect } from 'vitest'
import { SAMPLE_IMAGE_ASSETS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../assets/sample/sampleScene'
import { initialDoc } from '../assets/sample/initialDoc'

describe('sampleScene', () => {
  it('all assets have at least one URL', () => {
    for (const asset of Object.values(SAMPLE_IMAGE_ASSETS)) {
      expect(asset.urls.length).toBeGreaterThan(0)
      expect(asset.urls[0]).toMatch(/^data:image\/svg\+xml/)
    }
  })

  it('bunny has 3 poses', () => {
    expect(SAMPLE_IMAGE_ASSETS.bunny.urls).toHaveLength(3)
  })

  it('leaf has 2 poses', () => {
    expect(SAMPLE_IMAGE_ASSETS.leaf.urls).toHaveLength(2)
  })

  it('canvas dimensions are non-zero', () => {
    expect(CANVAS_WIDTH).toBeGreaterThan(0)
    expect(CANVAS_HEIGHT).toBeGreaterThan(0)
  })

})

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
