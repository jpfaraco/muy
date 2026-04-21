import { useCallback, useRef, useState } from 'react'
import { useInteractionStore, propertyToWidgetType } from '../../store/interactionStore'
import type { PropertyKey } from '../../types/animation'
import { clientToWidgetLayerPosition, getCanvasCenter, isPointInsidePropertiesPanel } from '../widgets/widgetUtils'
import { cn } from '@/lib/utils'

interface Props {
  property: PropertyKey
  label: string
  icon: React.ElementType
}

const DRAG_THRESHOLD = 8

export function PropertyButton({ property, label, icon: Icon }: Props) {
  const addWidget = useInteractionStore((s) => s.addWidget)
  const updateWidgetPosition = useInteractionStore((s) => s.updateWidgetPosition)
  const removeWidget = useInteractionStore((s) => s.removeWidget)
  const hasActiveWidget = useInteractionStore((s) =>
    s.floatingWidgets.some((w) => w.property === property)
  )

  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const widgetIdRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      startPosRef.current = { x: e.clientX, y: e.clientY }
      draggingRef.current = false
      widgetIdRef.current = null
      setIsDragging(true)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current) return
      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      const dist = Math.hypot(dx, dy)

      if (!draggingRef.current && dist > DRAG_THRESHOLD) {
        draggingRef.current = true
        const position = clientToWidgetLayerPosition(e.clientX, e.clientY)
        widgetIdRef.current = addWidget({
          type: propertyToWidgetType(property),
          property,
          position,
        })
      }

      if (widgetIdRef.current) {
        updateWidgetPosition(
          widgetIdRef.current,
          clientToWidgetLayerPosition(e.clientX, e.clientY),
          { x: 0, y: 0 },
        )
      }
    },
    [addWidget, property, updateWidgetPosition],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (widgetIdRef.current && isPointInsidePropertiesPanel(e.clientX, e.clientY)) {
        removeWidget(widgetIdRef.current)
      } else if (!draggingRef.current) {
        addWidget({
          type: propertyToWidgetType(property),
          property,
          position: getCanvasCenter(),
        })
      }

      startPosRef.current = null
      draggingRef.current = false
      widgetIdRef.current = null
      setIsDragging(false)
    },
    [addWidget, removeWidget, property],
  )

  return (
    <div className={cn('flex flex-col items-center gap-1', hasActiveWidget && 'pointer-events-none opacity-30')}>
      <div
        className={cn(
          'flex h-10 w-10 cursor-grab items-center justify-center rounded-lg border border-sidebar-border shadow-sm transition-colors active:cursor-grabbing',
          isDragging ? 'bg-accent' : 'hover:bg-accent/50',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
