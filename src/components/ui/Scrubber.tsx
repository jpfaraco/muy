import { useRef, useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScrubberProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  /** Increment per chevron click and step grid snap unit */
  step?: number
  /** Display precision */
  decimals?: number
  size?: 'sm' | 'md' | 'lg'
  width?: number | string
  /** Horizontal pixels of drag per one `step` of change */
  pixelsPerStep?: number
  disabled?: boolean
  ariaLabel?: string
  formatValue?: (v: number) => string
  onDragStart?: () => void
  onDragEnd?: () => void
  /** Called on any value change — useful for showing live previews */
  onChangeStart?: () => void
  onChangeEnd?: () => void
  className?: string
}

const TAP_THRESHOLD = 10

const TEXT_SIZE: Record<NonNullable<ScrubberProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

function clampToStep(raw: number, step: number, min: number, max: number): number {
  const snapped = Math.round(raw / step) * step
  return Math.min(max, Math.max(min, snapped))
}

function fmt(value: number, decimals: number, formatValue?: (v: number) => string): string {
  return formatValue ? formatValue(value) : value.toFixed(decimals)
}

export function Scrubber({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 0,
  size = 'md',
  width,
  pixelsPerStep = 3,
  disabled = false,
  ariaLabel,
  formatValue,
  onDragStart,
  onDragEnd,
  onChangeStart,
  onChangeEnd,
  className,
}: ScrubberProps) {
  const dragRef = useRef<{ startX: number; startValue: number; moved: boolean } | null>(null)
  const [isActive, setIsActive] = useState(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.stopPropagation()
      const el = e.currentTarget as Element
      if ('setPointerCapture' in el) el.setPointerCapture(e.pointerId)
      dragRef.current = { startX: e.clientX, startValue: value, moved: false }
      onDragStart?.()
    },
    [disabled, value, onDragStart],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      e.stopPropagation()
      const dx = e.clientX - dragRef.current.startX
      if (Math.abs(dx) >= TAP_THRESHOLD) dragRef.current.moved = true
      const raw = dragRef.current.startValue + (dx / pixelsPerStep) * step
      const next = clampToStep(raw, step, min, max)
      if (next !== value) {
        if (!isActive) {
          setIsActive(true)
          onChangeStart?.()
        }
        onChange(next)
      }
    },
    [value, pixelsPerStep, step, min, max, isActive, onChange, onChangeStart],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const wasDrag = dragRef.current?.moved ?? false
      dragRef.current = null
      if (wasDrag) {
        setIsActive(false)
        onDragEnd?.()
        onChangeEnd?.()
      } else if (isActive) {
        setIsActive(false)
        onChangeEnd?.()
      }
    },
    [isActive, onDragEnd, onChangeEnd],
  )

  const increment = useCallback(
    (delta: 1 | -1) => (e: React.PointerEvent | React.KeyboardEvent) => {
      e.stopPropagation()
      const next = clampToStep(value + delta * step, step, min, max)
      if (next !== value) {
        onChangeStart?.()
        onChange(next)
        onChangeEnd?.()
      }
    },
    [value, step, min, max, onChange, onChangeStart, onChangeEnd],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') increment(-1)(e)
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') increment(1)(e)
    },
    [increment],
  )

  const label = ariaLabel ?? 'Scrubber'

  return (
    <div
      className={cn('flex shrink-0 items-center', className)}
      style={{ width }}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemin={isFinite(min) ? min : undefined}
      aria-valuemax={isFinite(max) ? max : undefined}
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {/* Left chevron */}
      <button
        type="button"
        className="shrink-0 cursor-pointer select-none text-foreground/40 hover:text-foreground disabled:opacity-30"
        disabled={disabled || value <= min}
        tabIndex={-1}
        onPointerDown={increment(-1) as (e: React.PointerEvent) => void}
        aria-label="Decrease"
      >
        <ChevronLeft size={12} strokeWidth={2} />
      </button>

      {/* Draggable number */}
      <div
        data-testid="scrubber-track"
        className={cn(
          'flex-1 cursor-ew-resize select-none text-center font-mono tabular-nums',
          TEXT_SIZE[size],
          disabled ? 'text-foreground/30' : 'text-foreground',
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {fmt(value, decimals, formatValue)}
      </div>

      {/* Right chevron */}
      <button
        type="button"
        className="shrink-0 cursor-pointer select-none text-foreground/40 hover:text-foreground disabled:opacity-30"
        disabled={disabled || value >= max}
        tabIndex={-1}
        onPointerDown={increment(1) as (e: React.PointerEvent) => void}
        aria-label="Increase"
      >
        <ChevronRight size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

export type { ScrubberProps as ScrubberPropsType }
