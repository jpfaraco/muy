import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { MoveHorizontal, MoveVertical, RotateCw, Scaling, Blend, Route } from 'lucide-react'
import { useAnimationStore } from '../../store/animationStore'
import { useInteractionStore } from '../../store/interactionStore'
import { useCanvasViewStore } from '../../store/canvasViewStore'
import { PropertyButton } from '../LeftPanel/PropertyButton'
import type { PropertyKey } from '../../types/animation'

const PROPERTIES: Array<{ key: PropertyKey; label: string; icon: React.ElementType }> = [
  { key: 'x',            label: 'Move X',  icon: MoveHorizontal },
  { key: 'y',            label: 'Move Y',  icon: MoveVertical   },
  { key: 'rotation',     label: 'Rotate',  icon: RotateCw       },
  { key: 'scale',        label: 'Scale',   icon: Scaling        },
  { key: 'transparency', label: 'Alpha',   icon: Blend          },
  { key: 'progress',     label: 'Path',    icon: Route          },
]

function useSliderPreview() {
  const [showPreview, setShowPreview] = useState(false)
  const isDragging = useRef(false)

  useEffect(() => {
    const hide = () => {
      if (isDragging.current) {
        isDragging.current = false
        setShowPreview(false)
      }
    }
    document.addEventListener('pointerup', hide)
    document.addEventListener('pointercancel', hide)
    return () => {
      document.removeEventListener('pointerup', hide)
      document.removeEventListener('pointercancel', hide)
    }
  }, [])

  const onPointerDown = () => {
    isDragging.current = true
    setShowPreview(true)
  }

  return { showPreview, onPointerDown }
}

// Slider track is w-36 = 144px; native thumb is ~14px wide.
const SLIDER_TRACK_WIDTH = 144
const THUMB_WIDTH = 14

function thumbCenterX(value: number, min: number, max: number): number {
  const fraction = (value - min) / (max - min)
  return fraction * (SLIDER_TRACK_WIDTH - THUMB_WIDTH) + THUMB_WIDTH / 2
}

function StrokeWidthPreview({
  value,
  min,
  max,
  visible,
  color,
  variant,
  zoom,
}: {
  value: number
  min: number
  max: number
  visible: boolean
  color?: string
  variant: 'pencil' | 'eraser'
  zoom: number
}) {
  if (!visible) return null

  const size = Math.max(8, value * zoom)
  const cx = thumbCenterX(value, min, max)
  // SVG needs a few extra px so the stroke doesn't clip
  const svgPad = 4
  const svgSize = size + svgPad * 2
  const svgCx = svgSize / 2
  const svgR = size / 2

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: variant === 'pencil' ? `${cx - size / 2}px` : `${cx - svgSize / 2}px`,
        bottom: 'calc(100% + 8px)',
        filter: 'drop-shadow(0px 2px 6px rgba(0,0,0,0.45))',
      }}
    >
      {variant === 'pencil' ? (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: color,
          }}
        />
      ) : (
        <svg width={svgSize} height={svgSize} style={{ display: 'block' }}>
          <circle cx={svgCx} cy={svgCx} r={svgR} fill="none" stroke="rgba(0,0,0,0.85)" strokeWidth={3} />
          <circle cx={svgCx} cy={svgCx} r={svgR} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  )
}

function PencilOptions() {
  const drawColor        = useInteractionStore((s) => s.drawColor)
  const pencilWidth      = useInteractionStore((s) => s.pencilWidth)
  const pencilSmoothing  = useInteractionStore((s) => s.pencilSmoothing)
  const setDrawColor     = useInteractionStore((s) => s.setDrawColor)
  const setPencilWidth   = useInteractionStore((s) => s.setPencilWidth)
  const setPencilSmoothing = useInteractionStore((s) => s.setPencilSmoothing)
  const { showPreview, onPointerDown: onSliderPointerDown } = useSliderPreview()
  const zoom = useCanvasViewStore((s) => s.zoom)

  return (
    <div className="flex items-center gap-4">
      {/* Color picker — same as Canvas Settings */}
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          className="h-6 w-10 shrink-0 cursor-pointer px-1 py-[3px]"
        />
        <Input
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          className="h-6 w-[88px] py-[3px] font-mono"
          maxLength={7}
          placeholder="#000000"
        />
      </div>

      {/* Separator */}
      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Width value */}
      <Input
        type="number"
        min={1}
        max={64}
        value={pencilWidth}
        onChange={(e) => setPencilWidth(Math.min(64, Math.max(1, Number(e.target.value))))}
        className="h-6 w-11 py-[3px] text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Slider with floating circle preview */}
      <div className="relative">
        <StrokeWidthPreview
          value={pencilWidth}
          min={1}
          max={64}
          visible={showPreview}
          color={drawColor}
          variant="pencil"
          zoom={zoom}
        />
        <input
          type="range"
          min={1}
          max={64}
          step={1}
          value={pencilWidth}
          onChange={(e) => setPencilWidth(Number(e.target.value))}
          onPointerDown={onSliderPointerDown}
          className="h-1.5 w-36 cursor-pointer accent-foreground"
          style={{ touchAction: 'auto' }}
        />
      </div>

      {/* Separator */}
      <div className="h-6 w-px shrink-0 bg-border" />

      {/* Smoothness */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Smooth</span>
        <Input
          type="number"
          min={0}
          max={100}
          value={pencilSmoothing}
          onChange={(e) => setPencilSmoothing(Math.min(100, Math.max(0, Number(e.target.value))))}
          className="h-6 w-14 py-[3px] text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pencilSmoothing}
          onChange={(e) => setPencilSmoothing(Number(e.target.value))}
          className="h-1.5 w-28 cursor-pointer accent-foreground"
          style={{ touchAction: 'auto' }}
        />
      </div>
    </div>
  )
}

function EraserOptions() {
  const eraserWidth = useInteractionStore((s) => s.eraserWidth)
  const setEraserWidth = useInteractionStore((s) => s.setEraserWidth)
  const { showPreview, onPointerDown: onSliderPointerDown } = useSliderPreview()
  const zoom = useCanvasViewStore((s) => s.zoom)

  return (
    <div className="flex items-center gap-4">
      {/* Width value */}
      <Input
        type="number"
        min={1}
        max={128}
        value={eraserWidth}
        onChange={(e) => setEraserWidth(Math.min(128, Math.max(1, Number(e.target.value))))}
        className="h-6 w-11 py-[3px] text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Slider with floating circle preview */}
      <div className="relative">
        <StrokeWidthPreview
          value={eraserWidth}
          min={1}
          max={128}
          visible={showPreview}
          variant="eraser"
          zoom={zoom}
        />
        <input
          type="range"
          min={1}
          max={128}
          step={1}
          value={eraserWidth}
          onChange={(e) => setEraserWidth(Number(e.target.value))}
          onPointerDown={onSliderPointerDown}
          className="h-1.5 w-36 cursor-pointer accent-foreground"
          style={{ touchAction: 'auto' }}
        />
      </div>
    </div>
  )
}

function PivotOptions() {
  const heldLayerIds  = useInteractionStore((s) => s.heldLayerIds)
  const layers        = useAnimationStore((s) => s.doc.layers)
  const drawStrokes   = useAnimationStore((s) => s.drawStrokes)
  const setLayerPivot = useAnimationStore((s) => s.setLayerPivot)

  const targetLayerId = heldLayerIds[0] ?? null
  const targetLayer   = targetLayerId ? layers[targetLayerId] : null
  const isVectorHeld  = targetLayer?.layerType === 'vector'

  function handleAutoCenter() {
    if (!targetLayerId) return
    const strokes = drawStrokes[targetLayerId] ?? []
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    const expand = (x: number, y: number) => {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    for (const stroke of strokes) {
      expand(stroke.origin.x, stroke.origin.y)
      for (const seg of stroke.segments) {
        expand(seg.end.x, seg.end.y)
      }
    }
    if (!isFinite(minX)) return
    setLayerPivot(targetLayerId, (minX + maxX) / 2, (minY + maxY) / 2)
  }

  return (
    <button
      onClick={handleAutoCenter}
      disabled={!isVectorHeld}
      className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Auto center
    </button>
  )
}

function AnimateOptions() {
  return (
    <div data-properties-panel="true" className="flex items-center gap-4">
      {PROPERTIES.map((p) => (
        <PropertyButton key={p.key} property={p.key} label={p.label} icon={p.icon} />
      ))}
    </div>
  )
}

export function ToolOptions() {
  const activeTool = useInteractionStore((s) => s.activeTool)

  if (activeTool === 'select' || activeTool === 'hand') return null

  if (activeTool === 'animate') {
    return (
      <div className="pointer-events-auto rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <AnimateOptions />
      </div>
    )
  }

  const inner =
    activeTool === 'pencil' ? <PencilOptions /> :
    activeTool === 'eraser' ? <EraserOptions /> :
    <PivotOptions />

  if (!inner) return null

  return (
    <div className="pointer-events-auto rounded-xl border border-border bg-card p-3 shadow-lg">
      {inner}
    </div>
  )
}
