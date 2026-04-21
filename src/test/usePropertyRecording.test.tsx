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
