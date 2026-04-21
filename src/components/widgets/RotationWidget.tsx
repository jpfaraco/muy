import { useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useWidgetDrag } from '../../hooks/useWidgetDrag'
import { usePropertyRecording } from '../../hooks/usePropertyRecording'
import { useInteractionStore } from '../../store/interactionStore'
import type { FloatingWidget } from '../../types/interaction'
import { getWidgetLayerElement } from './widgetUtils'

interface Props {
  widget: FloatingWidget
}

const OUTER_SIZE = 160
const HANDLE_SIZE = 32
const HANDLE_ORBIT_RADIUS = 60

export function RotationWidget({ widget }: Props) {
  const { startRecording, stopRecording, recordDelta, hasHeldLayers } = usePropertyRecording('rotation')
  const removeWidget = useInteractionStore((s) => s.removeWidget)

  const [handleAngleDeg, setHandleAngleDeg] = useState(0)
  const centerRef = useRef<{ x: number; y: number } | null>(null)
  const lastAngleRef = useRef<number | null>(null)

  const { onPointerDown: onWidgetDown, onPointerMove: onWidgetMove, onPointerUp: onWidgetUp } = useWidgetDrag({
    widgetId: widget.id,
  })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hasHeldLayers) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      const layer = getWidgetLayerElement()
      if (!layer) return
      const layerRect = layer.getBoundingClientRect()
      centerRef.current = {
        x: layerRect.left + widget.position.x,
        y: layerRect.top + widget.position.y,
      }

      const dx = e.clientX - centerRef.current.x
      const dy = e.clientY - centerRef.current.y
      lastAngleRef.current = Math.atan2(dy, dx)
      startRecording()
    },
    [hasHeldLayers, startRecording, widget.position],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!centerRef.current || lastAngleRef.current === null) return
      const dx = e.clientX - centerRef.current.x
      const dy = e.clientY - centerRef.current.y
      const angle = Math.atan2(dy, dx)
      // Normalise delta to avoid wrap-around jumps
      const deltaRad = angle - lastAngleRef.current
      const deltaDeg = ((deltaRad * 180) / Math.PI + 540) % 360 - 180
      lastAngleRef.current = angle
      setHandleAngleDeg((prev) => prev + deltaDeg)
      recordDelta(deltaDeg)
    },
    [recordDelta],
  )

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (lastAngleRef.current === null) return
      lastAngleRef.current = null
      centerRef.current = null
      setHandleAngleDeg(0)
      stopRecording()
    },
    [stopRecording],
  )

  const angleRad = (handleAngleDeg * Math.PI) / 180
  const handleLeft = OUTER_SIZE / 2 + HANDLE_ORBIT_RADIUS * Math.sin(angleRad) - HANDLE_SIZE / 2
  const handleTop = OUTER_SIZE / 2 - HANDLE_ORBIT_RADIUS * Math.cos(angleRad) - HANDLE_SIZE / 2

  return (
    <div
      className="absolute pointer-events-auto select-none opacity-50"
      style={{
        left: widget.position.x - OUTER_SIZE / 2,
        top: widget.position.y - OUTER_SIZE / 2,
        width: OUTER_SIZE,
        height: OUTER_SIZE,
        touchAction: 'none',
      }}
      onPointerDown={(e) => onWidgetDown(e, widget.position)}
      onPointerMove={(e) => onWidgetMove(e)}
      onPointerUp={(e) => onWidgetUp(e)}
      onPointerCancel={(e) => onWidgetUp(e)}
    >
      {/* Ring track — evenodd donut path so fill + stroke apply to both edges */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="-1 -1 162 162"
      >
        <path
          fillRule="evenodd"
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth="1"
          d="M80,0 A80,80 0 0,1 160,80 A80,80 0 0,1 80,160 A80,80 0 0,1 0,80 A80,80 0 0,1 80,0 Z M80,40 A40,40 0 0,1 120,80 A40,40 0 0,1 80,120 A40,40 0 0,1 40,80 A40,40 0 0,1 80,40 Z"
        />
      </svg>

      {/* Handle — dragging controls rotation */}
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

      {/* Close button — top-right corner */}
      <button
        className="absolute pointer-events-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
        style={{ right: 0, top: 0 }}
        onPointerDown={(e) => { e.stopPropagation(); removeWidget(widget.id) }}
        aria-label="Close widget"
      >
        <X size={13} />
      </button>
    </div>
  )
}
