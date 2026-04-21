import { describe, it, expect, beforeEach } from 'vitest'
import { useAnimationStore } from '../store/animationStore'
import { DEFAULT_LAYER_PROPS } from '../types/animation'
import type { AnimationDoc } from '../types/animation'

function makeMinimalDoc(frameCount = 5): AnimationDoc {
  return {
    fps: 24,
    frameCount,
    layerIds: ['layer-a', 'layer-b'],
    layers: {
      'layer-a': { id: 'layer-a', name: 'A', type: 'layer', imageAssetId: 'asset-1', parentId: null },
      'layer-b': { id: 'layer-b', name: 'B', type: 'layer', imageAssetId: 'asset-1', parentId: null },
    },
    imageAssets: {
      'asset-1': { id: 'asset-1', name: 'Test', urls: ['data:image/png;base64,abc'] },
    },
    frames: Array.from({ length: frameCount }, () => ({})),
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#ffffff',
  }
}

describe('animationStore', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: makeMinimalDoc(),
      currentFrame: 0,
      isPlaying: false,
    })
  })

  it('setCurrentFrame clamps to valid range', () => {
    useAnimationStore.getState().setCurrentFrame(999)
    expect(useAnimationStore.getState().currentFrame).toBe(4)

    useAnimationStore.getState().setCurrentFrame(-5)
    expect(useAnimationStore.getState().currentFrame).toBe(0)
  })

  it('writeFrameValue writes a single property immutably', () => {
    const store = useAnimationStore.getState()
    const framesBefore = store.doc.frames

    store.writeFrameValue(2, 'layer-a', 'x', 123)

    const framesAfter = useAnimationStore.getState().doc.frames
    expect(framesAfter).not.toBe(framesBefore) // new reference
    expect(framesAfter[2]['layer-a'].x).toBe(123)
    expect(framesAfter[0]).toBe(framesBefore[0]) // other frames unchanged
  })

  it('writeFrameValue stores only the written property (sparse)', () => {
    useAnimationStore.getState().writeFrameValue(0, 'layer-a', 'x', 50)
    useAnimationStore.getState().writeFrameValue(0, 'layer-a', 'rotation', 45)

    const raw = useAnimationStore.getState().doc.frames[0]['layer-a']
    expect(raw.x).toBe(50)
    expect(raw.rotation).toBe(45)
    expect('scale' in raw).toBe(false) // sparse — only written props are stored

    // getLayerPropsAtFrame fills in missing props from defaults
    const resolved = useAnimationStore.getState().getLayerPropsAtFrame('layer-a', 0)
    expect(resolved.x).toBe(50)
    expect(resolved.rotation).toBe(45)
    expect(resolved.scale).toBe(DEFAULT_LAYER_PROPS.scale)
  })

  it('writeFrameValues writes multiple layer/property pairs atomically', () => {
    useAnimationStore.getState().writeFrameValues(1, [
      { layerId: 'layer-a', property: 'x', value: 10 },
      { layerId: 'layer-b', property: 'y', value: 20 },
    ])

    const fd = useAnimationStore.getState().doc.frames[1]
    expect(fd['layer-a'].x).toBe(10)
    expect(fd['layer-b'].y).toBe(20)
  })

  it('getLayerPropsAtFrame returns defaults for unrecorded frames', () => {
    const props = useAnimationStore.getState().getLayerPropsAtFrame('layer-a', 3)
    expect(props).toEqual(DEFAULT_LAYER_PROPS)
  })

  it('getLayerPropsAtFrame returns recorded values', () => {
    useAnimationStore.getState().writeFrameValue(3, 'layer-a', 'scale', 2.5)
    const props = useAnimationStore.getState().getLayerPropsAtFrame('layer-a', 3)
    expect(props.scale).toBe(2.5)
  })

  it('setIsPlaying updates playing state', () => {
    expect(useAnimationStore.getState().isPlaying).toBe(false)
    useAnimationStore.getState().setIsPlaying(true)
    expect(useAnimationStore.getState().isPlaying).toBe(true)
  })

  it('setDoc replaces the entire doc', () => {
    const newDoc = makeMinimalDoc(10)
    useAnimationStore.getState().setDoc(newDoc)
    expect(useAnimationStore.getState().doc.frameCount).toBe(10)
  })
})
