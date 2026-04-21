import { useCallback, useEffect, useRef } from 'react'
import { useAnimationStore } from '../store/animationStore'
import { useInteractionStore } from '../store/interactionStore'
import type { PropertyKey } from '../types/animation'

/**
 * Returns functions to record property values into the animation frames.
 *
 * Gap-fill strategy: React may batch several setCurrentFrame calls before
 * re-rendering, so the useEffect below could fire with currentFrame already
 * N frames ahead of the last write. prevWrittenFrameRef tracks the last frame
 * that received a direct write; the effect fills every frame in between using
 * writeFrameValuesRange so no frame is left with a stale default value.
 *
 * Stale-closure fix: recording callbacks read currentFrame from
 * useAnimationStore.getState() rather than from the React selector so they
 * always see the latest frame even if React hasn't re-rendered yet.
 */
export function usePropertyRecording(property: PropertyKey) {
  const getLayerPropsAtFrame = useAnimationStore((s) => s.getLayerPropsAtFrame)
  const writeFrameValues = useAnimationStore((s) => s.writeFrameValues)
  const writeFrameValuesRange = useAnimationStore((s) => s.writeFrameValuesRange)
  const currentFrame = useAnimationStore((s) => s.currentFrame)
  const getEffectiveHeldLayers = useInteractionStore((s) => s.getEffectiveHeldLayers)
  const layerListEntries = useInteractionStore((s) => s.layerListEntries)
  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds)
  const setLiveLayerProps = useInteractionStore((s) => s.setLiveLayerProps)
  const clearLiveLayerProps = useInteractionStore((s) => s.clearLiveLayerProps)

  // Accumulated live values per layer — never read back from frame data during a gesture
  const liveValuesRef = useRef<Record<string, number> | null>(null)
  // Last frame index that received a direct write — used for gap-fill
  const prevWrittenFrameRef = useRef<number>(-1)

  const startRecording = useCallback(() => {
    const frame = useAnimationStore.getState().currentFrame
    prevWrittenFrameRef.current = frame
    const effectiveHeld = getEffectiveHeldLayers()
    const snapshot: Record<string, number> = {}
    for (const layerId of effectiveHeld) {
      snapshot[layerId] = getLayerPropsAtFrame(layerId, frame)[property]
    }
    liveValuesRef.current = snapshot
    setLiveLayerProps(
      effectiveHeld.map((layerId) => ({
        layerId,
        props: { [property]: snapshot[layerId] },
      })),
    )
  }, [getEffectiveHeldLayers, getLayerPropsAtFrame, property, setLiveLayerProps])

  const stopRecording = useCallback(() => {
    const activeLayerIds = Object.keys(liveValuesRef.current ?? {})
    liveValuesRef.current = null
    prevWrittenFrameRef.current = -1
    if (activeLayerIds.length > 0) {
      clearLiveLayerProps(activeLayerIds, [property])
    }
  }, [clearLiveLayerProps, property])

  const recordDelta = useCallback(
    (delta: number) => {
      const effectiveHeld = getEffectiveHeldLayers()
      if (effectiveHeld.length === 0) return

      const frame = useAnimationStore.getState().currentFrame

      if (!liveValuesRef.current) {
        const snapshot: Record<string, number> = {}
        for (const layerId of effectiveHeld) {
          snapshot[layerId] = getLayerPropsAtFrame(layerId, frame)[property]
        }
        liveValuesRef.current = snapshot
      }

      // Fill any frames between last write and current frame with the OLD value
      const lastWritten = prevWrittenFrameRef.current
      if (lastWritten >= 0 && lastWritten + 1 < frame) {
        const gapUpdates = effectiveHeld.map((layerId) => ({
          layerId,
          property,
          value: liveValuesRef.current![layerId] ?? 0,
        }))
        writeFrameValuesRange(lastWritten + 1, frame - 1, gapUpdates)
      }

      const updates: Array<{ layerId: string; property: PropertyKey; value: number }> = []
      for (const layerId of effectiveHeld) {
        const entry = layerListEntries?.find((e) => e.layerId === layerId)
        const factor = entry ? entry.sensitivity / 100 : 1
        const prev = liveValuesRef.current[layerId] ?? 0
        const next = prev + delta * factor
        liveValuesRef.current[layerId] = next
        updates.push({ layerId, property, value: next })
      }

      setLiveLayerProps(
        effectiveHeld.map((layerId) => ({
          layerId,
          props: { [property]: liveValuesRef.current?.[layerId] ?? 0 },
        })),
      )
      writeFrameValues(frame, updates)
      prevWrittenFrameRef.current = frame
    },
    [property, getEffectiveHeldLayers, getLayerPropsAtFrame, writeFrameValues, writeFrameValuesRange, layerListEntries, setLiveLayerProps],
  )

  const recordAbsolute = useCallback(
    (value: number) => {
      const effectiveHeld = getEffectiveHeldLayers()
      if (effectiveHeld.length === 0) return
      const frame = useAnimationStore.getState().currentFrame

      // Fill any frames between last write and current frame with the PREVIOUS value
      // (the value held just before this new absolute was applied)
      const lastWritten = prevWrittenFrameRef.current
      if (lastWritten >= 0 && lastWritten + 1 < frame && liveValuesRef.current) {
        const gapUpdates = effectiveHeld.map((layerId) => ({
          layerId,
          property,
          value: liveValuesRef.current![layerId] ?? value,
        }))
        writeFrameValuesRange(lastWritten + 1, frame - 1, gapUpdates)
      }

      liveValuesRef.current = Object.fromEntries(effectiveHeld.map((layerId) => [layerId, value]))
      const updates = effectiveHeld.map((layerId) => ({ layerId, property, value }))
      setLiveLayerProps(
        effectiveHeld.map((layerId) => ({
          layerId,
          props: { [property]: value },
        })),
      )
      writeFrameValues(frame, updates)
      prevWrittenFrameRef.current = frame
    },
    [property, getEffectiveHeldLayers, writeFrameValues, writeFrameValuesRange, setLiveLayerProps],
  )

  // Fill any frames skipped due to React batching setCurrentFrame updates.
  // Runs after every re-render that sees a new currentFrame value.
  // IMPORTANT: use getState().currentFrame for the computation, not the React selector.
  // The selector can lag behind recordDelta (which always reads from getState()), causing
  // prevWrittenFrameRef to go backwards and leaving gaps unfilled.
  useEffect(() => {
    if (!liveValuesRef.current) return

    const updates = Object.entries(liveValuesRef.current).map(([layerId, value]) => ({
      layerId,
      property,
      value,
    }))
    if (updates.length === 0) return

    const prev = prevWrittenFrameRef.current
    const to = useAnimationStore.getState().currentFrame

    if (prev < 0) {
      writeFrameValues(to, updates)
    } else if (prev + 1 <= to) {
      writeFrameValuesRange(prev + 1, to, updates)
    }

    prevWrittenFrameRef.current = to
  }, [currentFrame, property, writeFrameValues, writeFrameValuesRange])

  const hasHeldLayers = heldLayerIds.length > 0 || (layerListEntries?.length ?? 0) > 0

  return { startRecording, stopRecording, recordDelta, recordAbsolute, hasHeldLayers }
}
