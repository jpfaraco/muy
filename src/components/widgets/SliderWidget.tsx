import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useWidgetDrag } from '../../hooks/useWidgetDrag'
import { usePropertyRecording } from '../../hooks/usePropertyRecording'
import { useInteractionStore } from '../../store/interactionStore'
import type { FloatingWidget } from '../../types/interaction'
import type { PropertyKey } from '../../types/animation'

interface Props {
  widget: FloatingWidget
}

const TRACK_MAJOR = 300
const TRACK_MINOR = 40
const HANDLE_SIZE = 32
const MAX_HANDLE_OFFSET = TRACK_MAJOR / 2 - HANDLE_SIZE / 2

function sensitivityForProperty(property: PropertyKey): number {
  switch (property) {
    case 'x': return 1
    case 'y': return 1
    case 'scale': return 0.01
    case 'transparency': return 0.005
    default: return 1
  }
}

export function SliderWidget({ widget }: Props) {
  const { startRecording, stopRecording, recordDelta, hasHeldLayers } = usePropertyRecording(widget.property)
  const removeWidget = useInteractionStore((s) => s.removeWidget)

  const isVertical = widget.type === 'slider-v'
  const trackWidth = isVertical ? TRACK_MINOR : TRACK_MAJOR
  const trackHeight = isVertical ? TRACK_MAJOR : TRACK_MINOR

  const [handleOffset, setHandleOffset] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const lastOffsetRef = useRef<number>(0)

  const { onPointerDown: onWidgetDown, onPointerMove: onWidgetMove, onPointerUp: onWidgetUp } = useWidgetDrag({
    widgetId: widget.id,
  })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasHeldLayers) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      dragStartRef.current = isVertical ? e.clientY : e.clientX
      lastOffsetRef.current = 0
      startRecording()
    },
    [hasHeldLayers, isVertical, startRecording],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartRef.current === null) return
      const current = isVertical ? e.clientY : e.clientX
      const totalOffset = current - dragStartRef.current
      const incremental = totalOffset - lastOffsetRef.current
      lastOffsetRef.current = totalOffset
      setHandleOffset(Math.max(-MAX_HANDLE_OFFSET, Math.min(MAX_HANDLE_OFFSET, totalOffset)))
      recordDelta(incremental * sensitivityForProperty(widget.property))
    },
    [isVertical, recordDelta, widget.property],
  )

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (dragStartRef.current === null) return
      dragStartRef.current = null
      lastOffsetRef.current = 0
      setHandleOffset(0)
      stopRecording()
    },
    [stopRecording],
  )

  const handleLeft = isVertical
    ? (TRACK_MINOR - HANDLE_SIZE) / 2
    : trackWidth / 2 + handleOffset - HANDLE_SIZE / 2
  const handleTop = isVertical
    ? trackHeight / 2 + handleOffset - HANDLE_SIZE / 2
    : (TRACK_MINOR - HANDLE_SIZE) / 2

  return (
    <div
      className="absolute pointer-events-auto select-none opacity-50"
      style={{
        left: widget.position.x - trackWidth / 2,
        top: widget.position.y - trackHeight / 2,
        width: trackWidth,
        height: trackHeight,
        touchAction: 'none',
      }}
      onPointerDown={(e) => onWidgetDown(e, widget.position)}
      onPointerMove={(e) => onWidgetMove(e)}
      onPointerUp={(e) => onWidgetUp(e)}
      onPointerCancel={(e) => onWidgetUp(e)}
    >
      {/* Track */}
      <div className="absolute inset-0 rounded-md border border-border bg-card shadow-md" />

      {/* Handle — dragging controls the value */}
      <div
        className="absolute rounded-full bg-card-foreground"
        style={{
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          left: handleLeft,
          top: handleTop,
          cursor: hasHeldLayers ? 'grab' : 'default',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* Close button — positioned outside the track */}
      <button
        className="absolute pointer-events-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        style={isVertical
          ? { left: trackWidth, top: 0 }
          : { right: 0, bottom: trackHeight }}
        onPointerDown={(e) => { e.stopPropagation(); removeWidget(widget.id) }}
        aria-label="Close widget"
      >
        <X size={13} />
      </button>
    </div>
  )
}
