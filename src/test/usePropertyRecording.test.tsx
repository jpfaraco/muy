import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePropertyRecording } from '../hooks/usePropertyRecording'
import { useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import type { AnimationDoc } from '../types/animation'

function makeMinimalDoc(frameCount = 5): AnimationDoc {
  return {
    fps: 24,
    frameCount,
    layerIds: ['layer-a'],
    layers: {
      'layer-a': { id: 'layer-a', name: 'A', type: 'layer', imageAssetId: 'asset-1', parentId: null },
    },
    imageAssets: {
      'asset-1': { id: 'asset-1', name: 'Test', urls: ['data:image/png;base64,abc'] },
    },
    frames: Array.from({ length: frameCount }, () => ({})),
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#ffffff',
    paletteId: 1,
  }
}

describe('usePropertyRecording', () => {
  beforeEach(() => {
    useAnimationStore.setState({
      doc: makeMinimalDoc(4),
      currentFrame: 0,
      isPlaying: true,
    })

    useInteractionStore.setState({
      heldLayerIds: ['layer-a'],
      layerListEntries: null,
      floatingWidgets: [],
      canvasDragActive: false,
      liveLayerProps: {},
    })
  })

  it('applies layer.sensitivity as a multiplier for recordDelta', () => {
    useAnimationStore.getState().setLayerSensitivity('layer-a', 0.5)

    const { result } = renderHook(() => usePropertyRecording('x'))

    act(() => {
      result.current.startRecording()
      result.current.recordDelta(100)
    })

    expect(useAnimationStore.getState().doc.frames[0]['layer-a'].x).toBe(50)
  })

  it('applies negative sensitivity to invert the delta', () => {
    useAnimationStore.getState().setLayerSensitivity('layer-a', -1)

    const { result } = renderHook(() => usePropertyRecording('x'))

    act(() => {
      result.current.startRecording()
      result.current.recordDelta(50)
    })

    expect(useAnimationStore.getState().doc.frames[0]['layer-a'].x).toBe(-50)
  })

  it('applies sensitivity > 1 to amplify the delta', () => {
    useAnimationStore.getState().setLayerSensitivity('layer-a', 2)

    const { result } = renderHook(() => usePropertyRecording('x'))

    act(() => {
      result.current.startRecording()
      result.current.recordDelta(30)
    })

    expect(useAnimationStore.getState().doc.frames[0]['layer-a'].x).toBe(60)
  })

  it('uses factor of 1 when layer has no sensitivity set', () => {
    const { result } = renderHook(() => usePropertyRecording('x'))

    act(() => {
      result.current.startRecording()
      result.current.recordDelta(40)
    })

    expect(useAnimationStore.getState().doc.frames[0]['layer-a'].x).toBe(40)
  })

  it('keeps the live property authoritative across frame advances while recording', async () => {
    const { result } = renderHook(() => usePropertyRecording('x'))

    act(() => {
      result.current.startRecording()
      result.current.recordDelta(25)
    })

    expect(useAnimationStore.getState().doc.frames[0]['layer-a'].x).toBe(25)
    expect(useInteractionStore.getState().liveLayerProps['layer-a']).toEqual({ x: 25 })

    act(() => {
      useAnimationStore.getState().setCurrentFrame(1)
    })

    await waitFor(() => {
      expect(useAnimationStore.getState().doc.frames[1]['layer-a'].x).toBe(25)
    })

    act(() => {
      useAnimationStore.getState().setCurrentFrame(2)
    })

    await waitFor(() => {
      expect(useAnimationStore.getState().doc.frames[2]['layer-a'].x).toBe(25)
    })

    act(() => {
      result.current.stopRecording()
    })

    expect(useInteractionStore.getState().liveLayerProps['layer-a']).toBeUndefined()
  })
})
