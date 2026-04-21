import { Pencil, Eraser, Move, Crosshair } from 'lucide-react'
import { useInteractionStore } from '../store/interactionStore'
import { useAnimationStore } from '../store/animationStore'
import { cn } from '@/lib/utils'
import type { DrawTool } from '../store/interactionStore'
import type { Stroke } from '../types/animation'

const TOOLS: Array<{ tool: DrawTool; icon: React.ElementType; label: string }> = [
  { tool: 'pencil', icon: Pencil,    label: 'Pencil' },
  { tool: 'eraser', icon: Eraser,    label: 'Eraser' },
  { tool: 'move',   icon: Move,      label: 'Move' },
  { tool: 'pivot',  icon: Crosshair, label: 'Pivot' },
]

function strokesToBoundsCenter(strokes: Stroke[]): { x: number; y: number } | null {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const stroke of strokes) {
    for (const pt of stroke.points) {
      if (pt.x < minX) minX = pt.x
      if (pt.x > maxX) maxX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.y > maxY) maxY = pt.y
    }
  }
  if (!isFinite(minX)) return null
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

export function DrawToolbox() {
  const drawTool   = useInteractionStore((s) => s.drawTool)
  const drawColor  = useInteractionStore((s) => s.drawColor)
  const drawWidth  = useInteractionStore((s) => s.drawWidth)
  const setDrawTool  = useInteractionStore((s) => s.setDrawTool)
  const setDrawColor = useInteractionStore((s) => s.setDrawColor)
  const setDrawWidth = useInteractionStore((s) => s.setDrawWidth)

  const heldLayerIds = useInteractionStore((s) => s.heldLayerIds)
  const layers       = useAnimationStore((s) => s.doc.layers)
  const drawStrokes  = useAnimationStore((s) => s.drawStrokes)
  const setLayerPivot = useAnimationStore((s) => s.setLayerPivot)

  const targetLayerId = heldLayerIds[0] ?? null
  const targetLayer   = targetLayerId ? layers[targetLayerId] : null
  const isVectorHeld  = targetLayer?.layerType === 'vector'

  const showStrokeControls = drawTool === 'pencil' || drawTool === 'eraser'

  function handleAutoCenter() {
    if (!targetLayerId || !isVectorHeld) return
    const center = strokesToBoundsCenter(drawStrokes[targetLayerId] ?? [])
    if (center) setLayerPivot(targetLayerId, center.x, center.y)
  }

  const previewColor = drawTool === 'eraser' ? '#4b5563' : drawColor

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row — same vertical rhythm as the Animate controls row */}
      <div className="flex items-center justify-between">

        {/* Left: tool selector + contextual auto-center */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-secondary p-0.5">
            {TOOLS.map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                aria-label={label}
                onClick={() => setDrawTool(tool)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  drawTool === tool
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {drawTool === 'pivot' && isVectorHeld && (
            <button
              onClick={handleAutoCenter}
              className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              Auto-center
            </button>
          )}
        </div>

        {/* Right: stroke controls (pencil + eraser only) */}
        {showStrokeControls && (
          <div className="flex items-center gap-5">
            {/* Color picker */}
            <label className="flex cursor-pointer items-center gap-2">
              <div
                className="h-5 w-5 shrink-0 rounded-full border-2 border-border shadow-sm"
                style={{ backgroundColor: drawColor }}
              />
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="sr-only"
                style={{ touchAction: 'auto' }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {drawColor.toUpperCase()}
              </span>
            </label>

            {/* Width slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Width</span>
              <input
                type="range"
                min={1}
                max={64}
                step={1}
                value={drawWidth}
                onChange={(e) => setDrawWidth(Number(e.target.value))}
                className="h-1.5 w-28 cursor-pointer accent-foreground"
                style={{ touchAction: 'auto' }}
              />
              <span className="w-6 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {drawWidth}
              </span>
            </div>
          </div>
        )}

        {/* Layer name (move / pivot / when vector held) */}
        {!showStrokeControls && isVectorHeld && (
          <p className="text-xs text-muted-foreground">
            {drawTool === 'pivot' ? 'Set pivot on ' : 'Moving '}
            <span className="font-medium text-foreground">{targetLayer!.name}</span>
          </p>
        )}
      </div>

    </div>
  )
}
