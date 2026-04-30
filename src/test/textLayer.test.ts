import { describe, it, expect, beforeEach } from 'vitest'
import { useAnimationStore } from '../store/animationStore'
import type { AnimationDoc } from '../types/animation'

function makeMinimalDoc(): AnimationDoc {
  return {
    fps: 24,
    frameCount: 10,
    layerIds: [],
    layers: {},
    imageAssets: {},
    frames: Array.from({ length: 10 }, () => ({})),
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#ffffff',
    paletteId: 1,
  }
}

describe('createTextLayer', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: makeMinimalDoc(),
      currentFrame: 0,
      isPlaying: false,
      drawStrokes: {},
    })
  })

  it('returns a non-empty string id', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 100, y: 200, width: null, color: '#ff0000', fontFamily: 'Patrick Hand', fontSize: 32,
    })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('adds the layer with correct properties', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 100, y: 200, width: null, color: '#ff0000', fontFamily: 'Patrick Hand', fontSize: 32,
    })
    const state = useAnimationStore.getState()
    const layer = state.doc.layers[id]
    expect(layer).toBeDefined()
    expect(layer.layerType).toBe('text')
    expect(layer.type).toBe('layer')
    expect(layer.parentId).toBeNull()
    expect(layer.text?.content).toBe('')
    expect(layer.text?.fontFamily).toBe('Patrick Hand')
    expect(layer.text?.fontSize).toBe(32)
    expect(layer.text?.color).toBe('#ff0000')
    expect(layer.text?.width).toBeNull()
  })

  it('adds the layer id to layerIds', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 100, y: 200, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    expect(useAnimationStore.getState().doc.layerIds).toContain(id)
  })

  it('writes x and y to frame 0', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 150, y: 250, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const frame0 = useAnimationStore.getState().doc.frames[0]
    expect(frame0[id]?.x).toBe(150)
    expect(frame0[id]?.y).toBe(250)
  })

  it('does not mutate any other layer or frame data', () => {
    useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    // All frames except frame 0 are still empty objects (or unchanged)
    const frames = useAnimationStore.getState().doc.frames
    for (let i = 1; i < frames.length; i++) {
      expect(Object.keys(frames[i])).toHaveLength(0)
    }
  })

  it('names layers sequentially', () => {
    const id1 = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const id2 = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const layers = useAnimationStore.getState().doc.layers
    expect(layers[id1].name).toBe('Text 1')
    expect(layers[id2].name).toBe('Text 2')
  })

  it('stores fixed width when provided', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: 400, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    expect(useAnimationStore.getState().doc.layers[id].text?.width).toBe(400)
  })
})

describe('updateTextContent', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: makeMinimalDoc(),
      currentFrame: 0,
      isPlaying: false,
      drawStrokes: {},
    })
  })

  it('updates content without mutating other fields', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const before = useAnimationStore.getState().doc.layers[id]
    useAnimationStore.getState().updateTextContent(id, 'Hello world')
    const after = useAnimationStore.getState().doc.layers[id]
    expect(after.text?.content).toBe('Hello world')
    // Other text fields unchanged
    expect(after.text?.fontFamily).toBe(before.text?.fontFamily)
    expect(after.text?.fontSize).toBe(before.text?.fontSize)
    // Returns new layer reference (immutability)
    expect(after).not.toBe(before)
  })

  it('returns new layers map (immutability)', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const beforeMap = useAnimationStore.getState().doc.layers
    useAnimationStore.getState().updateTextContent(id, 'Hi')
    const afterMap = useAnimationStore.getState().doc.layers
    expect(afterMap).not.toBe(beforeMap)
  })

  it('is a no-op for a non-text layer id', () => {
    const docBefore = useAnimationStore.getState().doc
    useAnimationStore.getState().updateTextContent('nonexistent', 'text')
    expect(useAnimationStore.getState().doc).toBe(docBefore)
  })
})

describe('updateTextStyle', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: makeMinimalDoc(),
      currentFrame: 0,
      isPlaying: false,
      drawStrokes: {},
    })
  })

  it('updates partial style fields', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    useAnimationStore.getState().updateTextStyle(id, { color: '#ff0000', fontSize: 48 })
    const text = useAnimationStore.getState().doc.layers[id].text
    expect(text?.color).toBe('#ff0000')
    expect(text?.fontSize).toBe(48)
    expect(text?.fontFamily).toBe('Inter') // unchanged
  })

  it('returns new layer reference (immutability)', () => {
    const id = useAnimationStore.getState().createTextLayer({
      x: 0, y: 0, width: null, color: '#000', fontFamily: 'Inter', fontSize: 24,
    })
    const before = useAnimationStore.getState().doc.layers[id]
    useAnimationStore.getState().updateTextStyle(id, { fontSize: 64 })
    const after = useAnimationStore.getState().doc.layers[id]
    expect(after).not.toBe(before)
    expect(after.text).not.toBe(before.text)
  })
})
