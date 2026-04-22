import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { SkipBack, Play, Pause, SkipForward, MoveHorizontal, MoveVertical, RotateCw, Scaling, Blend } from 'lucide-react'
import { useAnimationStore } from '../../store/animationStore'
import { useInteractionStore } from '../../store/interactionStore'
import { ThumbnailStrip } from '../Timeline/ThumbnailStrip'
import { PropertyButton } from '../LeftPanel/PropertyButton'
import type { PropertyKey } from '../../types/animation'

const PROPERTIES: Array<{ key: PropertyKey; label: string; icon: React.ElementType }> = [
  { key: 'x',            label: 'Move X',  icon: MoveHorizontal },
  { key: 'y',            label: 'Move Y',  icon: MoveVertical   },
  { key: 'rotation',     label: 'Rotate',  icon: RotateCw       },
  { key: 'scale',        label: 'Scale',   icon: Scaling        },
  { key: 'transparency', label: 'Alpha',   icon: Blend          },
]

function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = frame / fps
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const frames = frame % fps
  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
    String(frames).padStart(2, '0'),
  ].join(' : ')
}

function StrokePreview({ width, color }: { width: number; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const W = 80
  const H = 24

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.min(width, H * 0.85)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const amplitude = Math.max(1, (H - ctx.lineWidth) / 2)
    ctx.beginPath()
    ctx.moveTo(4, H / 2)
    for (let x = 4; x <= W - 4; x++) {
      const t = (x - 4) / (W - 8)
      ctx.lineTo(x, H / 2 + amplitude * Math.sin(t * Math.PI * 2.5))
    }
    ctx.stroke()
  }, [width, color])

  return <canvas ref={canvasRef} width={W} height={H} className="shrink-0" />
}

function PencilOptions() {
  const drawColor  = useInteractionStore((s) => s.drawColor)
  const pencilWidth = useInteractionStore((s) => s.pencilWidth)
  const setDrawColor  = useInteractionStore((s) => s.setDrawColor)
  const setPencilWidth = useInteractionStore((s) => s.setPencilWidth)

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

      {/* Slider */}
      <input
        type="range"
        min={1}
        max={64}
        step={1}
        value={pencilWidth}
        onChange={(e) => setPencilWidth(Number(e.target.value))}
        className="h-1.5 w-36 cursor-pointer accent-foreground"
        style={{ touchAction: 'auto' }}
      />

      {/* Stroke preview */}
      <StrokePreview width={pencilWidth} color={drawColor} />
    </div>
  )
}

function EraserOptions() {
  const eraserWidth = useInteractionStore((s) => s.eraserWidth)
  const setEraserWidth = useInteractionStore((s) => s.setEraserWidth)

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

      {/* Slider */}
      <input
        type="range"
        min={1}
        max={128}
        step={1}
        value={eraserWidth}
        onChange={(e) => setEraserWidth(Number(e.target.value))}
        className="h-1.5 w-36 cursor-pointer accent-foreground"
        style={{ touchAction: 'auto' }}
      />

      {/* Stroke preview */}
      <StrokePreview width={eraserWidth} color="#6b7280" />
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
    for (const stroke of strokes) {
      for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x
        if (pt.x > maxX) maxX = pt.x
        if (pt.y < minY) minY = pt.y
        if (pt.y > maxY) maxY = pt.y
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
  const { isPlaying, setIsPlaying, currentFrame } = useAnimationStore()
  const fps        = useAnimationStore((s) => s.doc.fps)
  const frameCount = useAnimationStore((s) => s.doc.frameCount)
  const setCurrentFrame = useAnimationStore((s) => s.setCurrentFrame)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border p-1.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
              aria-label="Skip to start"
              onPointerDown={(e) => { e.stopPropagation(); setCurrentFrame(0) }}
            >
              <SkipBack className="h-full w-full" />
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border p-2.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onPointerDown={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying) }}
            >
              {isPlaying ? <Pause className="h-full w-full" /> : <Play className="h-full w-full" />}
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border p-1.5 shadow-sm transition-colors hover:bg-accent/50 text-foreground"
              aria-label="Skip to end"
              onPointerDown={(e) => { e.stopPropagation(); setCurrentFrame(frameCount - 1) }}
            >
              <SkipForward className="h-full w-full" />
            </button>
          </div>
          <div
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground tabular-nums"
            style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
          >
            {formatTimestamp(currentFrame, fps)}
          </div>
        </div>
        <div data-properties-panel="true" className="flex items-center gap-4">
          {PROPERTIES.map((p) => (
            <PropertyButton key={p.key} property={p.key} label={p.label} icon={p.icon} />
          ))}
        </div>
      </div>
      <ThumbnailStrip />
    </div>
  )
}

export function ToolOptions() {
  const activeTool = useInteractionStore((s) => s.activeTool)

  if (activeTool === 'select') return null

  if (activeTool === 'animate') {
    return (
      <div className="w-full rounded-xl border border-border bg-card p-3 shadow-lg">
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
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
      {inner}
    </div>
  )
}
