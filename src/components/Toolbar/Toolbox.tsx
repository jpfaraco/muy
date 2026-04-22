import { MousePointer2, Pencil, Eraser, Crosshair, Film } from 'lucide-react'
import { useInteractionStore } from '../../store/interactionStore'
import { cn } from '@/lib/utils'
import type { ActiveTool } from '../../store/interactionStore'


export function Toolbox() {
  const activeTool = useInteractionStore((s) => s.activeTool)
  const setActiveTool = useInteractionStore((s) => s.setActiveTool)

  const btn = (tool: ActiveTool, Icon: React.ElementType, label: string) => (
    <button
      key={tool}
      aria-label={label}
      onClick={() => setActiveTool(tool)}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
        activeTool === tool
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg">
      {btn('select',  MousePointer2, 'Select')}
      <div className="h-6 w-px shrink-0 bg-border" />
      {btn('pencil',  Pencil,        'Pencil')}
      {btn('eraser',  Eraser,        'Eraser')}
      {btn('pivot',   Crosshair,     'Pivot')}
      {btn('animate', Film,          'Animate')}
    </div>
  )
}
