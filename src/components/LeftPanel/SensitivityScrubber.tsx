import { useRef, useCallback, useState } from 'react'
import { captureHistoryEntry, useAnimationStore } from '../../store/animationStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  layerId: string
  value: number
}

const STEP = 0.003 // 0.01 per ~3px of horizontal drag (≈300px per unit)
const TAP_THRESHOLD = 10 // px — absorbs Apple Pencil tip drift on taps
const TOOLTIP_DURATION = 1500 // ms

export function SensitivityScrubber({ layerId, value }: Props) {
  const setLayerSensitivity = useAnimationStore((s) => s.setLayerSensitivity)

  const dragRef = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      captureHistoryEntry()
      useAnimationStore.temporal.getState().pause()
      dragRef.current = { startX: e.clientX, startValue: value, moved: false }
    },
    [value],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      e.stopPropagation()
      const dx = e.clientX - dragRef.current.startX
      if (Math.abs(dx) >= TAP_THRESHOLD) dragRef.current.moved = true
      const next = Math.round((dragRef.current.startValue + dx * STEP) * 100) / 100
      setLayerSensitivity(layerId, next)
    },
    [layerId, setLayerSensitivity],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const wasTap = dragRef.current !== null && !dragRef.current.moved
    dragRef.current = null
    useAnimationStore.temporal.getState().resume()

    if (wasTap) {
      if (tooltipTimerRef.current !== null) clearTimeout(tooltipTimerRef.current)
      setOpen(true)
      tooltipTimerRef.current = setTimeout(() => setOpen(false), TOOLTIP_DURATION)
    }
  }, [])

  return (
    <TooltipProvider>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="top" avoidCollisions={false}>Drag to change</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
