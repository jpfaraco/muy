import { useState, useCallback, useRef } from 'react'
import { GripHorizontal, X } from 'lucide-react'
import { useAnimationStore } from '../../store/animationStore'
import type { LayerListEntry } from '../../types/interaction'

interface Props {
  entries: LayerListEntry[]
  onDismiss: () => void
}

const WIDGET_WIDTH = 200
const FLICK_THRESHOLD = 600 // px/s

export function LayerListWidget({ entries, onDismiss }: Props) {
  const doc = useAnimationStore((s) => s.doc)

  const [widgetPos, setWidgetPos] = useState({ x: 180, y: 250 })

  const widgetDragRef = useRef<{
    startX: number
    startY: number
    startPos: { x: number; y: number }
  } | null>(null)
  const lastVelocityRef = useRef(0)
  const lastTimestampRef = useRef(0)
  const lastClientXRef = useRef(0)

  const handleWidgetPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      widgetDragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...widgetPos } }
      lastVelocityRef.current = 0
      lastTimestampRef.current = e.timeStamp
      lastClientXRef.current = e.clientX
    },
    [widgetPos],
  )

  const handleWidgetPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!widgetDragRef.current) return
      const dt = (e.timeStamp - lastTimestampRef.current) / 1000
      if (dt > 0) {
        lastVelocityRef.current = (e.clientX - lastClientXRef.current) / dt
      }
      lastTimestampRef.current = e.timeStamp
      lastClientXRef.current = e.clientX

      setWidgetPos({
        x: widgetDragRef.current.startPos.x + (e.clientX - widgetDragRef.current.startX),
        y: widgetDragRef.current.startPos.y + (e.clientY - widgetDragRef.current.startY),
      })
    },
    [],
  )

  const handleWidgetPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      widgetDragRef.current = null
      if (Math.abs(lastVelocityRef.current) > FLICK_THRESHOLD) {
        onDismiss()
      }
    },
    [onDismiss],
  )

  return (
    <div
      className="absolute pointer-events-auto select-none rounded-[24px] border border-[#3557b8] bg-[linear-gradient(180deg,rgba(18,23,37,0.96)_0%,rgba(9,13,23,0.94)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
      style={{ left: widgetPos.x, top: widgetPos.y, width: WIDGET_WIDTH, touchAction: 'none' }}
      onPointerDown={handleWidgetPointerDown}
      onPointerMove={handleWidgetPointerMove}
      onPointerUp={handleWidgetPointerUp}
      onPointerCancel={handleWidgetPointerUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#273148] px-3 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#294b98] bg-[#14203a] text-[#84b3ff]">
          <GripHorizontal size={15} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#dfe8ff]">Layer List</span>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#273148] bg-[#101724] text-[#88a3d7] transition-colors hover:border-[#4c74d6] hover:text-white"
          onPointerDown={(e) => { e.stopPropagation(); onDismiss() }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Layer rows */}
      {entries.map((entry) => {
        const layer = doc.layers[entry.layerId]
        if (!layer) return null
        return (
          <div
            key={entry.layerId}
            className="flex items-center gap-2 border-b border-[#202838] px-3 py-2 last:border-b-0"
          >
            <span className="flex-1 truncate text-[12px] text-[#d8dff0]">{layer.name}</span>
          </div>
        )
      })}

      {/* Hint */}
      <div className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#5b6a8b]">
        Tap layers to add
      </div>
    </div>
  )
}
