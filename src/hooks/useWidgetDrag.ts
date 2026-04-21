import { useCallback, useRef } from 'react'
import { useInteractionStore } from '../store/interactionStore'
import type { Vec2 } from '../types/interaction'

const FLICK_VELOCITY_THRESHOLD = 600 // px/s

interface UseWidgetDragOptions {
  widgetId: string
  onDragDelta?: (dx: number, dy: number) => void
}

/** Returns pointer handlers for a draggable widget with flick-to-dismiss */
export function useWidgetDrag({ widgetId, onDragDelta }: UseWidgetDragOptions) {
  const updateWidgetPosition = useInteractionStore((s) => s.updateWidgetPosition)
  const dismissWidget = useInteractionStore((s) => s.dismissWidget)
  const removeWidget = useInteractionStore((s) => s.removeWidget)

  const lastPosRef = useRef<Vec2 | null>(null)
  const lastTimestampRef = useRef<number>(0)
  const velocityRef = useRef<Vec2>({ x: 0, y: 0 })
  const currentPosRef = useRef<Vec2>({ x: 0, y: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent, initialPosition: Vec2) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      lastPosRef.current = { x: e.clientX, y: e.clientY }
      lastTimestampRef.current = e.timeStamp
      currentPosRef.current = initialPosition
      velocityRef.current = { x: 0, y: 0 }
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent, currentPosition?: Vec2) => {
      if (!lastPosRef.current) return
      e.stopPropagation()

      const dt = (e.timeStamp - lastTimestampRef.current) / 1000
      if (dt <= 0) return

      const dx = e.clientX - lastPosRef.current.x
      const dy = e.clientY - lastPosRef.current.y

      velocityRef.current = {
        x: dx / dt,
        y: dy / dt,
      }

      const basePosition = currentPosition ?? currentPosRef.current
      const newPos = {
        x: basePosition.x + dx,
        y: basePosition.y + dy,
      }
      currentPosRef.current = newPos

      updateWidgetPosition(widgetId, newPos, velocityRef.current)
      onDragDelta?.(dx, dy)

      lastPosRef.current = { x: e.clientX, y: e.clientY }
      lastTimestampRef.current = e.timeStamp
    },
    [widgetId, updateWidgetPosition, onDragDelta],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      lastPosRef.current = null

      const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y)
      if (speed > FLICK_VELOCITY_THRESHOLD) {
        dismissWidget(widgetId)
        setTimeout(() => removeWidget(widgetId), 350)
      }
    },
    [widgetId, dismissWidget, removeWidget],
  )

  return { onPointerDown, onPointerMove, onPointerUp }
}
