import { describe, it, expect } from 'vitest'
import { SAMPLE_IMAGE_ASSETS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../assets/sample/sampleScene'
import { initialDoc } from '../assets/sample/initialDoc'
import { getFlatRenderIds } from '../store/animationStore'

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

  it('all layerIds reference valid layers', () => {
    for (const id of initialDoc.layerIds) {
      expect(initialDoc.layers[id]).toBeDefined()
    }
  })

  it('all leaf layers reference valid image assets', () => {
    for (const layer of Object.values(initialDoc.layers)) {
      if (layer.type === 'layer' && layer.imageAssetId) {
        expect(initialDoc.imageAssets[layer.imageAssetId]).toBeDefined()
      }
    }
  })

  it('frame 0 has base props for each render layer', () => {
    const renderLayerIds = getFlatRenderIds(initialDoc)
    const frame0 = initialDoc.frames[0]
    for (const layerId of renderLayerIds) {
      expect(frame0[layerId]).toBeDefined()
      expect(typeof frame0[layerId].x).toBe('number')
      expect(typeof frame0[layerId].y).toBe('number')
    }
  })

  it('frames after frame 0 start empty (keyframes written on demand)', () => {
    for (const frame of initialDoc.frames.slice(1)) {
      expect(Object.keys(frame)).toHaveLength(0)
    }
  })

  it('groups reference valid child layer ids', () => {
    for (const layer of Object.values(initialDoc.layers)) {
      if (layer.type === 'group' && layer.childIds) {
        for (const childId of layer.childIds) {
          expect(initialDoc.layers[childId]).toBeDefined()
        }
      }
    }
  })
})
