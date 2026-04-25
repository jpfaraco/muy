import { useRef, useCallback } from 'react'
import { captureHistoryEntry, useAnimationStore } from '../../store/animationStore'

interface Props {
  layerId: string
  value: number
}

const STEP = 0.01 // 1 unit per 100px of horizontal drag

export function SensitivityScrubber({ layerId, value }: Props) {
  const setLayerSensitivity = useAnimationStore((s) => s.setLayerSensitivity)

  const dragRef = useRef<{ startX: number; startValue: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      captureHistoryEntry()
      useAnimationStore.temporal.getState().pause()
      dragRef.current = { startX: e.clientX, startValue: value }
    },
    [value],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      e.stopPropagation()
      const dx = e.clientX - dragRef.current.startX
      const next = Math.round((dragRef.current.startValue + dx * STEP) * 100) / 100
      setLayerSensitivity(layerId, next)
    },
    [layerId, setLayerSensitivity],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    dragRef.current = null
    useAnimationStore.temporal.getState().resume()
  }, [])

  return (
    <div
      className="w-12 shrink-0 cursor-ew-resize select-none text-right font-mono text-xs tabular-nums text-foreground/60 hover:text-foreground"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {value.toFixed(2)}
    </div>
  )
}
